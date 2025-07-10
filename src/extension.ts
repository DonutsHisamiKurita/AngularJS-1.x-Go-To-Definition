

// extension.ts

import * as vscode from 'vscode';
import * as path from 'path';

/**
 * 拡張機能がアクティブ化されたときに呼び出されます
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand(
        'angularjs-goto-service.goToServiceDefinition', // package.jsonで定義されたコマンド名
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No active editor.');
                return;
            }

            const selection = editor.selection;
            let selectedWord = editor.document.getText(selection).trim(); // 選択された単語
            const lineText = editor.document.lineAt(selection.active.line).text; // 現在の行のテキスト全体

            if (!selectedWord) {
                vscode.window.showInformationMessage('No text selected.');
                return;
            }

            // 選択された単語からクォートを削除（例: 'MyTestService' -> MyTestService）
            const cleanedSelectedWord = selectedWord.replace(/^['"]|['"]$/g, '');

            let primaryServiceName: string; // ファイル推測に使用するメインのサービス名 (例: 'MyTestService')
            let targetFunctionName: string;  // 実際に定義を検索する関数名 (例: 'MyTestService' または 'doSomething')

            const dotIndex = cleanedSelectedWord.indexOf('.');
            if (dotIndex !== -1) {
                // 例: "MyTestService.doSomething" を選択した場合
                primaryServiceName = cleanedSelectedWord.substring(0, dotIndex);
                targetFunctionName = cleanedSelectedWord.substring(dotIndex + 1);
            } else {
                // 例: "MyTestService" や "doSomething" (単独) を選択した場合
                // 現在の行のテキスト全体から「ServiceName.methodName」パターンを推測して親サービス名を取得する
                // これにより、メソッド名だけをハイライトした場合でも、親サービス名を推測できるようにする
                const callPattern = new RegExp(`(\\w+)\\.${cleanedSelectedWord}\\s*\\(`, 'i'); // 例: MyService.doSomething()
                const match = lineText.match(callPattern);

                if (match && match[1]) {
                    primaryServiceName = match[1]; // MyService を取得
                    targetFunctionName = cleanedSelectedWord; // doSomething を保持
                } else {
                    // どちらのパターンにも合致しない場合、選択された単語をそのまま使用
                    primaryServiceName = cleanedSelectedWord;
                    targetFunctionName = cleanedSelectedWord;
                }
            }

            console.log(`[Plugin Debug] Selected word: "${selectedWord}"`);
            console.log(`[Plugin Debug] Primary Service Name (for file guess): "${primaryServiceName}"`);
            console.log(`[Plugin Debug] Target Function Name (for definition search): "${targetFunctionName}"`);


            vscode.window.showInformationMessage(`Searching for definition of: "${targetFunctionName}"...`);

            const definitionLocations: vscode.LocationLink[] = [];

            // 1. まず、現在のファイル内で定義を探す
            // searchInFile関数は、primaryServiceNameを使ってファイル推測を行わず、
            // そのファイルのURIを使って直接そのファイル内でtargetFunctionNameの定義を検索します。
            await searchInFile(editor.document.uri, primaryServiceName, targetFunctionName, definitionLocations);

            // 2. ワークスペース内の別ファイルでの定義を推測して検索する
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

                // ファイル推測には primaryServiceName を使う
                const guessedFilePatterns = getGuessedFilePatterns(primaryServiceName);

                console.log(`[Plugin Debug] Guessed file patterns for "${primaryServiceName}":`, guessedFilePatterns);

                for (const pattern of guessedFilePatterns) {
                    // **/*/${pattern} はワークスペース内の任意の深さのディレクトリでパターンを探す
                    const files = await vscode.workspace.findFiles(
                        `**/${pattern}`,
                        '**/node_modules/**', // node_modules ディレクトリは除外
                        100 // 検索するファイルの最大数（パフォーマンスのため）
                    );
                    console.log(`[Plugin Debug] Found files for pattern "${pattern}":`, files.map(f => path.relative(workspaceRoot, f.fsPath)));

                    for (const fileUri of files) {
                        // 現在開いているファイルは、既に上で検索済みなのでスキップ
                        if (fileUri.fsPath === editor.document.uri.fsPath) {
                            continue;
                        }
                        // 別ファイルが見つかったら、そのファイル内で targetFunctionName を検索
                        await searchInFile(fileUri, primaryServiceName, targetFunctionName, definitionLocations);
                    }
                }
            }
            
            // 検索結果に基づいてジャンプまたはクイックピックを表示
            if (definitionLocations.length === 0) {
                vscode.window.showInformationMessage(`Could not find definition for "${selectedWord}".`);
            } else if (definitionLocations.length === 1) {
                const loc = definitionLocations[0].targetUri;
                const range = definitionLocations[0].targetRange;
                
                // 1つだけ定義が見つかった場合、明示的にそのテキストドキュメントを開き、選択範囲を設定してジャンプする
                const textDocument = await vscode.workspace.openTextDocument(loc);
                await vscode.window.showTextDocument(textDocument, { selection: range, preview: false, preserveFocus: false });
                
            } else {
                // 複数の候補がある場合、クイックピックで選択させる
                const selected = await vscode.window.showQuickPick(
                    definitionLocations.map(loc => ({
                        label: path.basename(loc.targetUri.fsPath) + (loc.targetRange ? `:${loc.targetRange.start.line + 1}` : ''),
                        description: vscode.workspace.asRelativePath(loc.targetUri), // ワークスペースからの相対パスで表示
                        location: loc
                    })),
                    { placeHolder: `Multiple definitions found for "${selectedWord}". Select one:` }
                );

                if (selected) {
                    const loc = selected.location.targetUri;
                    const range = selected.location.targetRange;
                    const textDocument = await vscode.workspace.openTextDocument(loc);
                    await vscode.window.showTextDocument(textDocument, { selection: range, preview: false, preserveFocus: false });
                }
            }
        }
    );

    // 拡張機能がVS Codeによって管理されるようにdisposableを登録
    context.subscriptions.push(disposable);
}

// searchInFile 関数、getGuessedFilePatterns 関数、deactivate 関数は別途定義されています。
// このactivate関数はそれらの関数がスコープ内で利用可能であることを前提としています。

// extension.ts 内の searchInFile 関数
/**
 * 指定されたファイル内でサービス定義または関数定義を検索し、結果をdefinitionLocationsに追加する
 * @param fileUri ファイルのURI
 * @param primaryServiceName サービス名（ファイル推測用、例: 'MyTestService'）
 * @param targetFunctionName 検索する関数名（サービス名またはメソッド名、例: 'MyTestService' または 'doSomething'）
 * @param definitionLocations 見つかった定義を追加する配列
 */
async function searchInFile(fileUri: vscode.Uri, primaryServiceName: string, targetFunctionName: string | null, definitionLocations: vscode.LocationLink[]) {
    const document = await vscode.workspace.openTextDocument(fileUri);
    const text = document.getText();
    console.log(`[Plugin Debug] Searching in file: ${fileUri.fsPath}`);

    // ★追加: もしこのファイルがapp.jsのような、定義元ではないことが確定しているファイルなら、ここでスキップ
    // このパスは、あなたのplayground/app.jsの絶対パスに置き換えてください。
    // `vscode.workspace.rootPath` は非推奨ですが、AngularJS 1.x の古いプロジェクトでは代替が難しい場合があります。
    // よりモダンな方法としては、ワークスペースフォルダのURIを使うのが安全です。
    let APP_JS_PATH = '';
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        APP_JS_PATH = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'playground', 'app.js');
    }
    
    if (fileUri.fsPath === APP_JS_PATH) {
        console.log(`[Plugin Debug] Skipping definition search in app.js as it's typically a consumer file.`);
        return; // app.jsでは定義を検索しない
    }

    const patterns: RegExp[] = []; // ここで正規表現パターンを初期化します

    if (targetFunctionName) {
        // メソッド名または関数名が指定されている場合
        // ここに正規表現パターンが追加されます

        // 1. function <targetFunctionName>(...) { ... } の形式の定義
        //    行頭または非単語文字（スペース、記号など）の後に `function` キーワードに続く関数名
        patterns.push(new RegExp(`(?:^|\\s|\\W)function\\s+${targetFunctionName}\\s*\\(`, 'g'));

        // 2. const|let|var <targetFunctionName> = function(...) { ... } または () => { ... } の形式の定義
        //    行頭または非単語文字の後に変数宣言に続く関数名またはアロー関数
        patterns.push(new RegExp(`(?:^|\\s|\\W)(?:const|let|var)\\s+${targetFunctionName}\\s*=\\s*(?:function|\\(?\\w*\\)?\\s*=>)`, 'g'));

        // 3. class <targetFunctionName> { ... } （クラス自体へのジャンプ用。クラス名がターゲットの場合）
        //    行頭または非単語文字の後に `class` キーワードに続くクラス名
        patterns.push(new RegExp(`(?:^|\\s|\\W)class\\s+${targetFunctionName}\\s*{`, 'g'));

        // 4. オブジェクトリテラル内のメソッド定義（例: { doSomething: function() { ... } } や doSomething() { ... }）
        //    `(?<!\.)` は「直前にドットがない」ことを意味する負の後読みアサーションです。
        //    これにより、`obj.methodName()` のような「呼び出し」ではなく、「定義」に絞り込みます。
        //    VS Codeの環境で負の後読みがサポートされていることを前提とします。
        patterns.push(new RegExp(`(?<!\\.)(?:${targetFunctionName}:\\s*(?:function|\\(?\\w*\\)?\\s*=>)|${targetFunctionName}\\s*\\([^{]*\\)\\s*{)`, 'g'));

    } else {
        // targetFunctionNameがnullの場合（通常、選択した文字列があればこのブロックは実行されません）
        // 主にDI文字列からのサービス名へのジャンプ用パターン
        patterns.push(new RegExp(`\\.service\\(['"]${primaryServiceName}['"],\\s*(?:function\\s+${primaryServiceName}|\\w+)?`, 'g'));
        patterns.push(new RegExp(`\\.factory\\(['"]${primaryServiceName}['"],\\s*(?:function\\s+${primaryServiceName}|\\w+)?`, 'g'));
        patterns.push(new RegExp(`\\.controller\\(['"]${primaryServiceName}['"],\\s*(?:function\\s+${primaryServiceName}|\\w+)?`, 'g'));
    }

    console.log(`[Plugin Debug] Searching with patterns for "${targetFunctionName}":`, patterns.map(p => p.source));

    // 見つかった定義の位置を記録するためのSet
    // これにより、同じファイル内の同じ行にある重複した定義の追加を防ぎます
    const addedLocationsSet = new Set<string>(); // フォーマット: "filePath:line"

    for (const pattern of patterns) {
        pattern.lastIndex = 0; // 各パターンで検索を開始する前にlastIndexをリセットします。これは重要です。
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const position = document.positionAt(match.index);
            const matchedText = match[0];
            const range = new vscode.Range(position, new vscode.Position(position.line, position.character + matchedText.length));

            // マッチしたテキストの直前がドットの場合、それは通常メソッドの呼び出しなのでスキップします。
            // これにより、`.doSomething()` のような呼び出しへの誤ジャンプを防ぎます。
            if (position.character > 0 && text[position.character - 1] === '.') {
                console.log(`[Plugin Debug] Skipping match due to preceding dot: "${matchedText}" at ${fileUri.fsPath}:${position.line + 1}`);
                continue;
            }

            // ファイルパスと行番号を組み合わせたキーで重複をチェックします。
            const uniqueKey = `${fileUri.fsPath}:${position.line}`;
            if (addedLocationsSet.has(uniqueKey)) {
                console.log(`[Plugin Debug] Skipping duplicate definition (unique key): ${uniqueKey} (Pattern: ${pattern.source}) - Already added`);
                continue; // 既に追加されている場合はスキップ
            }

            // 定義ロケーションを配列に追加します
            definitionLocations.push({
                targetUri: fileUri,
                targetRange: range
            });
            addedLocationsSet.add(uniqueKey); // Setにユニークキーを追加

            console.log(`[Plugin Debug] Added definition: ${fileUri.fsPath}:${position.line + 1} (Pattern: ${pattern.source})`);
        }
    }
}

// getGuessedFilePatterns 関数は変更なし
function getGuessedFilePatterns(serviceName: string): string[] {
    // ... 既存のコード ...
    const patterns: string[] = [];
    const lowerCamelCase = serviceName.charAt(0).toLowerCase() + serviceName.slice(1);
    const kebabCase = serviceName.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();

    patterns.push(`${serviceName}.js`); patterns.push(`${serviceName}.ts`);
    patterns.push(`${lowerCamelCase}.js`); patterns.push(`${lowerCamelCase}.ts`);
    patterns.push(`${kebabCase}.js`); patterns.push(`${kebabCase}.ts`);
    patterns.push(`${lowerCamelCase}/index.js`); patterns.push(`${kebabCase}/index.js`);

    if (serviceName.endsWith('Service') || serviceName.endsWith('Factory') || serviceName.endsWith('Controller')) {
        const baseName = serviceName.replace(/(Service|Factory|Controller)$/, '');
        const lowerCamelBaseName = baseName.charAt(0).toLowerCase() + baseName.slice(1);
        const kebabBaseName = baseName.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();

        patterns.push(`${baseName}.js`); patterns.push(`${baseName}.ts`);
        patterns.push(`${lowerCamelBaseName}.js`); patterns.push(`${lowerCamelBaseName}.ts`);
        patterns.push(`${kebabBaseName}.js`); patterns.push(`${kebabBaseName}.ts`);
        patterns.push(`${lowerCamelBaseName}/index.js`); patterns.push(`${kebabBaseName}/index.js`);
    }

    return Array.from(new Set(patterns));
}

export function deactivate() {}

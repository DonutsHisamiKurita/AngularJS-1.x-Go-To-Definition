// extension.ts
import * as vscode from 'vscode';

/**
 * 拡張機能がアクティブ化されたときに呼び出されます
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand(
        'angularjs-goto-service.goToServiceDefinition',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No active editor.');
                return;
            }

            const selection = editor.selection;
            const word = editor.document.getText(selection).trim();

            if (!word) {
                vscode.window.showInformationMessage('No text selected.');
                return;
            }

            // 選択された文字列がAngularJSの命名規則に沿っているか軽くチェック
            // 例: 大文字で始まるサービス名、または 'Service' で終わるなど
            if (!/^[A-Z][a-zA-Z0-9]+(Service|Factory|Controller)?$/.test(word)) {
                vscode.window.showInformationMessage(`"${word}" does not look like an AngularJS service/factory/controller name.`);
                return;
            }

            vscode.window.showInformationMessage(`Searching for AngularJS component: "${word}"...`);

            // ワークスペース全体からJavaScriptファイルを検索
            // 例: project_root/**/*.js (node_modules を除く)
            const files = await vscode.workspace.findFiles(
                '**/*.js',
                '**/node_modules/**', // 除外パターン
                100 // 最大ファイル数（パフォーマンス考慮）
            );

            if (files.length === 0) {
                vscode.window.showInformationMessage('No JavaScript files found in workspace.');
                return;
            }

            interface DefinitionLocation {
                uri: vscode.Uri;
                range: vscode.Range;
                label: string;
            }

            const definitionLocations: DefinitionLocation[] = [];

            for (const fileUri of files) {
                const document = await vscode.workspace.openTextDocument(fileUri);
                const text = document.getText();

                // サービス、ファクトリ、コントローラ定義の正規表現パターン
                // 例:
                // .service('ServiceName', function ServiceName(...) { ...
                // .factory('FactoryName', function FactoryName(...) { ...
                // .controller('ControllerName', function ControllerName(...) { ...
                // function ServiceName(...) { ...
                // var ServiceName = function(...) { ...
                const patterns: RegExp[] = [
                    // angular.module('appName').service('ServiceName', ...);
                    new RegExp(`\\.service\\(['"]${word}['"],\\s*(?:function\\s+${word}|\\w+)?`, 'g'),
                    new RegExp(`\\.factory\\(['"]${word}['"],\\s*(?:function\\s+${word}|\\w+)?`, 'g'),
                    new RegExp(`\\.controller\\(['"]${word}['"],\\s*(?:function\\s+${word}|\\w+)?`, 'g'),
                    // function ServiceName(...) { ...
                    new RegExp(`^function\\s+${word}\\s*\\(`, 'gm'),
                    // var ServiceName = function(...) { ...
                    new RegExp(`^[\\s]*var\\s+${word}\\s*=\\s*function\\s*\\(`, 'gm'),
                ];

                for (const pattern of patterns) {
                    let match;
                    while ((match = pattern.exec(text)) !== null) {
                        const position = document.positionAt(match.index);
                        definitionLocations.push({
                            uri: fileUri,
                            range: new vscode.Range(position, position),
                            label: `${word} in ${vscode.workspace.asRelativePath(fileUri)}:${position.line + 1}`
                        });
                    }
                }
            }

            if (definitionLocations.length === 0) {
                vscode.window.showInformationMessage(`Could not find definition for "${word}".`);
            } else if (definitionLocations.length === 1) {
                const loc = definitionLocations[0];
                vscode.window.showTextDocument(loc.uri, { selection: loc.range });
            } else {
                // 複数の候補がある場合、クイックピックで選択させる
                const selected = await vscode.window.showQuickPick(
                    definitionLocations.map(loc => ({ label: loc.label, location: loc })),
                    { placeHolder: `Multiple definitions found for "${word}". Select one:` }
                );

                if (selected) {
                    vscode.window.showTextDocument(selected.location.uri, { selection: selected.location.range });
                }
            }
        }
    );

    context.subscriptions.push(disposable);
}

/**
 * 拡張機能が無効化されたときに呼び出されます
 */
export function deactivate() {}
// test/extension.test.ts

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
// import * as fs from 'fs'; // fsは直接使わないのでコメントアウトか削除

suite('AngularJS Go To Service Definition Functional Test Suite', () => {
    // testWorkspacePath を絶対パスで取得
    const testWorkspacePath = path.resolve(__dirname, '../../playground'); 

    setup(async () => {
        vscode.window.showInformationMessage('Start all tests.');
    });

    test('Command "angularjs-goto-service.goToServiceDefinition" should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        // ★修正点: コマンドが登録されていることを確認
        assert.ok(commands.includes('angularjs-goto-service.goToServiceDefinition'), 'Command "angularjs-goto-service.goToServiceDefinition" should be registered.');
    });

    test('should jump to doSomething() definition in a separate file', async () => {
        const appJsUri = vscode.Uri.file(path.join(testWorkspacePath, 'app.js'));
        const appJsDocument = await vscode.workspace.openTextDocument(appJsUri);
        const appJsEditor = await vscode.window.showTextDocument(appJsDocument);

        const targetLineIndex = 14; 
        const lineText = appJsDocument.lineAt(targetLineIndex).text;
        const textToSelect = "doSomething";
        const startIndex = lineText.indexOf(textToSelect);

        assert.notStrictEqual(startIndex, -1, `"${textToSelect}" not found in line ${targetLineIndex + 1} of app.js`);
        
        const endIndex = startIndex + textToSelect.length;

        appJsEditor.selection = new vscode.Selection(
            new vscode.Position(targetLineIndex, startIndex),
            new vscode.Position(targetLineIndex, endIndex)
        );

        await vscode.commands.executeCommand('angularjs-goto-service.goToServiceDefinition');

        const expectedFilePath = vscode.Uri.file(path.join(testWorkspacePath, 'services', 'myTestService.js')).fsPath;
        const expectedLine = 3; 

        let jumpedSuccessfully = false;
        const maxAttempts = 20; 
        const delayMs = 100; 

        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, delayMs)); 

            if (vscode.window.activeTextEditor?.document.uri.fsPath === expectedFilePath &&
                vscode.window.activeTextEditor?.selection.active.line === expectedLine) {
                jumpedSuccessfully = true;
                break; 
            }
        }

        // ★修正点: ジャンプが成功したことをアサート
        assert.ok(jumpedSuccessfully, `Should have jumped to the correct file and line (${path.basename(expectedFilePath)}:${expectedLine + 1}).`);
        
        // オプション: 詳細なチェックを続けるなら
        if (jumpedSuccessfully) {
            assert.strictEqual(vscode.window.activeTextEditor?.document.uri.fsPath, expectedFilePath, 'Final check: Active editor path mismatch');
            assert.strictEqual(vscode.window.activeTextEditor?.selection.active.line, expectedLine, 'Final check: Active editor line mismatch');
        }

        vscode.window.showInformationMessage('Test for doSomething() jump completed successfully!');

    }).timeout(20000); 
});
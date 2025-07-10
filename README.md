# AngularJS 1.x Go To Definition 🚀

## Overview

**AngularJS 1.x Go To Definition** は、Visual Studio Code での モジュールバンドラーを使用していない AngularJS 1系のプロジェクトのコードナビゲーションを改善する拡張機能です。予め定義された**パターンマッチ**を使用して、文字列ベースの依存性注入 (`'MyService'`) や、別ファイルに分割されたサービス・ファクトリ・コントローラのメソッド呼び出し (`MyService.doSomething()`) から、その**定義元へ素早くジャンプ**できるようになります。

## Feature

この拡張機能は、以下のコードジャンプ機能を提供します。

- メソッド呼び出しからのジャンプ

呼び出し元の `myService.doSomething()` の `doSomething` または`myService.doSomething()`を選択すると、その `doSomething` メソッドが定義されている別ファイルの関数ブロックにジャンプします。

<video src="/src/assets/guide.mov" controls="true"></video>

## Usage

1.  ジャンプしたい**サービスのメソッド名**の文字列（例: `MyService.doSomething()`または`doSomething`）をエディタ上で選択（ハイライト）します。
2.  ハイライトした状態で、以下のいずれかの操作を行います。
    - **右クリック**し、コンテキストメニューから「**AngularJS Go To Definition 🚀**」を選択します。
    - **`Alt + G`** (デフォルトのキーバインディング。`package.json` で変更可能) を押します。

## Install

1. パッケージのインストール

```bash
npm ci
```

2. 拡張機能のパッケージ化

```bash
npx vsce package
```

ルートに`angularjs-1x-go-to-definition-0.0.1.vsix`が書き出されます。

3.  拡張機能のインストール

```bash
code --install-extension angularjs-1x-go-to-definition--0.0.1.vsix
```

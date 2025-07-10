// MyTestServiceの実際の定義
// このファイルがコードジャンプのターゲットとなります
function MyTestService() { // ★ここにジャンプさせたい
    function doSomething () {
        console.log('MyTestService is doing something from a separate file!');
        alert('Service action from separate file!');
    };

    return {
        doSomething: doSomething,
    }
}
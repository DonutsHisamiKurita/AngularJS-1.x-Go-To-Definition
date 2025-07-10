// playground/app.js

angular.module('myApp', [])
    .controller('MainController', MainController)
    .service('MyTestService', MyTestService) // MyTestServiceを登録
    .factory('AnotherFactory', AnotherFactory); // AnotherFactoryを登録

MainController.$inject = ['MyTestService', 'AnotherFactory'];
function MainController(MyTestService, AnotherFactory) {
    const vm = this;
    vm.serviceName = 'MyTestService';
    vm.factoryData = '';

    vm.callService = function() {
        MyTestService.doSomething();
    };

    vm.callFactory = function() {
        vm.factoryData = AnotherFactory.getData();
        alert('Factory data: ' + vm.factoryData);
    };
}

// ここではサービスの定義は行いません。
// 定義は services/myTestService.js と services/anotherFactory.js にあります。
// ただし、VS CodeのGo to Definitionが機能するために、
// 実際に読み込まれていることを示す必要があります。
// HTMLでスクリプトを読み込むことで、実行時には認識されます。
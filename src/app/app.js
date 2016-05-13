
angular.module('scloader', [
  'ngRoute',
  'scloader.todo',
  'scloader.device'
])
.config(function ($routeProvider) {
  'use strict';
  $routeProvider
    .when('/todo', {
      controller: 'TodoCtrl',
      templateUrl: '/scloader/todo/todo.html'
    })
    .when('/device', {
      controller: 'DeviceCtrl',
      templateUrl: '/scloader/device/device.html'
    })
    .otherwise({
      redirectTo: '/device'
    });
});

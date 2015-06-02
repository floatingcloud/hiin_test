'use strict';

// AngularJS 에서 module을 정의할 때 뒤에 dependecy list를 주게 되면 새로운 module을 정의하겠다는 소리고
// 단순히 angular.module('services') 하게 되면 기존에 만들어진 module을 refer하겠다는 의미임.

// services 라는 모듈 선언
angular.module('services', [])
  // API_PORT를 상수로 정의. API_PORT는 나중에 dependency injection에서 쓰일 수 있음.
  .constant('API_PORT', 3000)
  // API_HOST를 상수로 정의.
  //.constant('API_HOST', "http://192.168.11.5");
  .constant('API_HOST', "http://125.209.197.79");
  //.constant('API_HOST', "http://sdent.kr");
  //.constant('API_HOST', "http://localhost");

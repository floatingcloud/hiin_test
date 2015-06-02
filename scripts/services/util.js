(function() {
  'use strict';
  angular.module('services').factory('Util', function($q, $http, $window, $location, $document, Host, Token, $ionicModal, $timeout, $state, $rootScope) {
    return {
      serverUrl: function() {
        return "" + (Host.getAPIHost()) + ":" + (Host.getAPIPort());
      },
      makeReq: function(method, path, param) {
        console.log("" + (Host.getAPIHost()) + ":" + (Host.getAPIPort()) + "/" + path);
        return $http[method]("" + (Host.getAPIHost()) + ":" + (Host.getAPIPort()) + "/" + path, (method === "get" ? {
          params: param
        } : param), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      },
      authReq: function(method, path, param, options) {
        var opts;
        if (options == null) {
          options = {};
        }
        if (options.headers == null) {
          options.headers = {};
        }
        options.headers["Authorization"] = "" + (Token.authToken());
        options.headers["Content-Type"] = 'application/x-www-form-urlencoded';
        opts = {};
        if (method === "get") {
          opts = {
            method: "get",
            url: "" + (Host.getAPIHost()) + ":" + (Host.getAPIPort()) + "/" + path,
            params: param
          };
        } else {
          opts = {
            method: method,
            url: "" + (Host.getAPIHost()) + ":" + (Host.getAPIPort()) + "/" + path,
            data: param
          };
        }
        opts = angular.extend(opts, options);
        return $http(opts);
      },
      MakeId: function(userInfo) {
        var deferred;
        console.log(userInfo);
        deferred = $q.defer();
        userInfo.device = $rootScope.deviceType;
        userInfo.deviceToken = $rootScope.deviceToken;
        this.makeReq('post', 'user', userInfo).success(function(data) {
          if (data.status < "0") {
            deferred.reject(data);
          }
          return deferred.resolve(data);
        }).error(function(data, status) {
          console.log(data);
          return deferred.reject(status);
        });
        this.ClearLocalStorage();
        return deferred.promise;
      },
      emailLogin: function(userInfo) {
        var deferred;
        deferred = $q.defer();
        userInfo.device = $rootScope.deviceType;
        userInfo.deviceToken = $rootScope.deviceToken;
        console.log(userInfo);
        this.makeReq('post', 'login', userInfo).success(function(data) {
          if (data.status < 0) {
            deferred.reject(data.status);
          }
          $window.localStorage.setItem("auth_token", data.Token);
          $window.localStorage.setItem("id_type", 'normal');
          return deferred.resolve(data);
        }).error(function(error, status) {
          return deferred.reject(status);
        });
        this.ClearLocalStorage();
        return deferred.promise;
      },
      userStatus: function() {
        var deferred;
        deferred = $q.defer();
        this.authReq('get', 'userStatus', '').success(function(data) {
          console.log('-suc-userstatus');
          console.log(data);
          if (data.status < 0) {
            deferred.reject(data.status);
          }
          return deferred.resolve(data);
        }).error(function(error, status) {
          return deferred.reject(status);
        });
        return deferred.promise;
      },
      checkOrganizer: function() {
        var deferred;
        deferred = $q.defer();
        this.authReq('get', 'checkOrganizer', '').success(function(data) {
          console.log('-suc-check organizer');
          console.log(data);
          if (data.status < 0) {
            deferred.reject(data.status);
          }
          return deferred.resolve(data);
        }).error(function(error, status) {
          return deferred.reject(status);
        });
        return deferred.promise;
      },
      ConfirmEvent: function(formData) {
        var deferred;
        deferred = $q.defer();
        this.authReq('post', 'enterEvent', formData).success(function(data) {
          if (data.status < 0) {
            deferred.reject(data.status);
            console.log(data);
          }
          return deferred.resolve(data);
        }).error(function(error, status) {
          return deferred.reject(status);
        });
        return deferred.promise;
      },
      ShowModal: function(scope, html_file) {
        console.log('show modal');
        return $ionicModal.fromTemplateUrl("views/modal/" + html_file + ".html", (function($ionicModal) {
          scope.modal = $ionicModal;
          scope.modal.show();
        }), {
          scope: scope,
          animation: "slide-in-up"
        });
      },
      ClearLocalStorage: function() {
        if ($window.localStorage != null) {
          $window.localStorage.clear();
        }
        if (window.cordova) {
          $window.localStorage.setItem("isPhoneGap", "1");
        }
      },
      trimStr: function(str, byteSize) {
        var byte, j, len, trimStr;
        byte = 0;
        trimStr = "";
        j = 0;
        len = str.length;
        while (j < len) {
          if (str.charCodeAt(j) < 0x100) {
            byte++;
          } else {
            byte += 2;
          }
          trimStr += str.charAt(j);
          if (byte >= byteSize) {
            trimStr = trimStr.substr(0, j - 2) + "...";
            break;
          }
          j++;
        }
        return trimStr;
      }
    };
  });

}).call(this);

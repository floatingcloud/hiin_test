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

(function() {
  angular.module('services').factory('Token', function($q, $http, $window, $location, Host) {
    if ($window.localStorage == null) {
      alert("$window.localStorage doesn't exist");
    }
    return {
      authToken: function() {
        return $window.localStorage.getItem("auth_token");
      }
    };
  });

}).call(this);

(function() {
  'use strict';
  angular.module("filters", []).filter("gender", function() {
    return function(input) {
      if (input === '1') {
        return "Female";
      } else {
        return "Male";
      }
    };
  }).filter("getUserById", function() {
    return function(input, id) {
      var i, len;
      i = 0;
      if (input === null) {
        return null;
      }
      len = input.length;
      while (i < len) {
        if (input[i]._id === id) {
          return input[i];
        }
        i++;
      }
      return null;
    };
  }).filter('profileImage', function(Util) {
    return function(input) {
      var newVal;
      newVal = input;
      if (input.indexOf('http') < 0) {
        newVal = Util.serverUrl() + "/" + newVal;
      }
      return newVal;
    };
  }).filter("toShortSentence", function(Util) {
    return function(input, count) {
      console.log(input);
      console.log(count);
      return Util.trimStr(input, count);
    };
  }).filter('noHTML', function() {
    return function(text) {
      if (text != null) {
        return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/, '&amp;');
      }
    };
  }).filter("replaceLink", function($sce) {
    return function(text) {
      return $sce.trustAsHtml(text != null ? text.replace(/(http:\/\/[\x21-\x7e]+)/gi, "<a href='$1'>$1</a>") : '');
    };
  });

}).call(this);

(function() {
  angular.module('services').factory('Host', function($window, API_HOST, API_PORT) {
    var host, _API_HOST, _API_PORT;
    _API_HOST = API_HOST;
    if ($window.localStorage != null) {
      host = $window.localStorage.getItem("api_host");
      console.log("localstorage host = " + host);
      if (host && host !== "") {
        _API_HOST = host;
      }
    }
    _API_PORT = API_PORT;
    return {
      getAPIHost: function() {
        return _API_HOST;
      },
      getAPIPort: function() {
        return _API_PORT;
      },
      setAPIPort: function(port) {
        console.log("set api port! host = " + port);
        return _API_PORT = port;
      }
    };
  });

}).call(this);

(function() {
  angular.module('services').factory('imageReader', function($q, $log) {
    var getReader, onError, onLoad, onProgress, readAsDataURL;
    onLoad = function(reader, deferred, scope) {
      return function() {
        scope.$apply(function() {
          deferred.resolve(reader.result);
        });
      };
    };
    onError = function(reader, deferred, scope) {
      return function() {
        scope.$apply(function() {
          deferred.reject(reader.result);
        });
      };
    };
    onProgress = function(reader, scope) {
      return function(event) {
        scope.$broadcast("fileProgress", {
          total: event.total,
          loaded: event.loaded
        });
      };
    };
    getReader = function(deferred, scope) {
      var reader;
      reader = new FileReader();
      reader.onload = onLoad(reader, deferred, scope);
      reader.onerror = onError(reader, deferred, scope);
      reader.onprogress = onProgress(reader, scope);
      return reader;
    };
    readAsDataURL = function(file, scope) {
      var deferred, reader;
      deferred = $q.defer();
      reader = getReader(deferred, scope);
      reader.readAsDataURL(file);
      return deferred.promise;
    };
    return {
      readAsDataUrl: readAsDataURL
    };
  });

}).call(this);

(function() {
  angular.module('services').factory('socket', function(socketFactory, Host, $window) {
    var myIoSocket, mySocket;
    myIoSocket = io.connect("" + (Host.getAPIHost()) + ":" + (Host.getAPIPort()) + "/hiin", {
      query: "token=" + $window.localStorage.getItem("auth_token"),
      'reconnection delay': 1000,
      'reconnection limit': 1000,
      'max reconnection attempts': 'Infinity'
    });
    mySocket = socketFactory({
      ioSocket: myIoSocket
    });
    return mySocket;
  });

}).call(this);

(function() {
  'use strict';
  angular.module('services').factory('SocketClass', function($q, $window, $ionicModal, $timeout, $state, $rootScope, socket, $ionicLoading) {
    return {
      resSocket: function(options) {
        var TimerFunc, deferred, recieved, repeatCount, socketFunc, waiting;
        recieved = false;
        repeatCount = 0;
        socketFunc = function(data) {
          recieved = true;
          console.log("got on");
          console.log(recieved);
          return options.onCallback(data);
        };
        deferred = $q.defer();
        if (options.showLoadingFlg) {
          $ionicLoading.show({
            template: "Loading..."
          });
        }
        if (options.emitData) {
          socket.emit(options.emit, options.emitData);
        } else {
          socket.emit(options.emit);
        }
        socket.on(options.on, socketFunc);
        TimerFunc = function() {
          var waiting;
          if (repeatCount < 4 && recieved === false) {
            repeatCount = repeatCount + 1;
            options.duration = options.duration + 300;
            console.log(repeatCount);
            console.log(options.duration);
            waiting = $timeout((function() {
              return TimerFunc();
            }), options.duration);
            return;
          }
          if (recieved) {
            socket.removeListener(options.emit, socketFunc);
            console.log('socket suc');
            $ionicLoading.hide();
            return deferred.resolve('success');
          } else {
            socket.removeListener(options.emit, socketFunc);
            console.log('error');
            $ionicLoading.hide();
            return deferred.reject('fail');
          }
        };
        waiting = $timeout((function() {
          return TimerFunc();
        }), options.duration);
        return deferred.promise;
      },

      /*
      parameter
      1.emitName (string) -> socket이름
      2.emitData (onject) -> 서버에 보내는 data 
      3.duration (int) -> 리턴하는 시간, 로딩표시가 on일 경우 디폴트로 1초, 아닐 경우 100ms
      4.showLoadingFlg (bool) -> 로딩 표시
       */
      socketClass: function(emitName, emitData, duration, showLoadingFlg) {
        var SocketOptions;
        SocketOptions = (function() {
          function SocketOptions(emit, emitData, duration, showLoadingFlg) {
            this.emit = emit;
            this.emitData = emitData;
            this.duration = duration;
            this.showLoadingFlg = showLoadingFlg;
            this.on = this.emit;
            if (this.duration === 0) {
              if (this.showLoadingFlg) {
                this.duration = 1000;
              } else {
                this.duration = 100;
              }
            }
          }

          SocketOptions.prototype.onCallback = function(data) {
            throw Error('unimplemented method');
          };

          return SocketOptions;

        })();
        return new SocketOptions(emitName, emitData, duration, showLoadingFlg);
      }
    };
  });

}).call(this);

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

(function() {
  angular.module('services').factory('Migration', function() {
    return {
      truncate: function(db) {
        console.log("migration truncate!");
        return db.transaction(function(tx) {
          var table_name;
          table_name = "message";
          return tx.executeSql("DELETE FROM " + table_name);
        }, function(error) {
          return console.error("Transaction error : " + error.message);
        });
      },
      apply: function(db) {
        console.log("webDb.apply");
        return db.transaction(function(tx) {
          var table_name;
          table_name = "chatMessages";
          tx.executeSql("CREATE TABLE IF NOT EXISTS " + table_name + " (id unique, message, from_id, from_name, thumnailUrl,regTime,eventCoide,msgId)");
          return console.log("transaction function finished");
        }, function(error) {
          return console.error("Transaction error = " + error.message);
        });
      }
    };
  });

}).call(this);

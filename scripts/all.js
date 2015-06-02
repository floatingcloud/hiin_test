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

(function() {
  "use strict";
  angular.module("hiin", ["ionic", "ngRoute", "services", "filters", "btford.socket-io", "ui.bootstrap", "lr.upload"]).config(function($stateProvider, $urlRouterProvider) {
    $stateProvider.state("/", {
      url: "/",
      templateUrl: "views/login/login.html",
      controller: "LoginCtrl"
    }).state("signin", {
      url: "/signin",
      templateUrl: "views/login/signin.html",
      controller: "SignInCtrl"
    }).state("organizerLogin", {
      url: "/organizerLogin",
      templateUrl: "views/login/organizer_login.html",
      controller: "OrganizerLoginCtrl"
    }).state("resetPassword", {
      url: "/resetPassword",
      templateUrl: "views/login/reset_password.html",
      controller: "OrganizerLoginCtrl"
    }).state('list', {
      url: '/list',
      abstract: true,
      templateUrl: 'views/menu/menu.html',
      controller: 'MenuCtrl'
    }).state("list.notice", {
      url: "/notice",
      views: {
        menuContent: {
          templateUrl: "views/chat/notice.html",
          controller: "NoticeCtrl"
        }
      }
    }).state("list.userlists", {
      url: "/userlists",
      views: {
        menuContent: {
          templateUrl: "views/list/list.html",
          controller: "ListCtrl"
        }
      }
    }).state("list.single", {
      url: "/userlists/:userId",
      views: {
        menuContent: {
          templateUrl: "views/chat/chat_room.html",
          controller: "chatCtrl"
        }
      }
    }).state("list.groupChat", {
      url: "/groupChat",
      views: {
        menuContent: {
          templateUrl: "views/chat/chat_room.html",
          controller: "grpChatCtrl"
        }
      }
    }).state("list.activity", {
      url: "/activity",
      views: {
        menuContent: {
          templateUrl: "views/list/activity.html",
          controller: "ActivityCtrl"
        }
      }
    }).state("list.eventInfo", {
      url: "/eventInfo",
      views: {
        menuContent: {
          templateUrl: "views/event/info_event.html",
          controller: "eventInfoCtrl"
        }
      }
    }).state("list.profile", {
      url: "/profile",
      views: {
        menuContent: {
          templateUrl: "views/menu/profile.html",
          controller: "ProfileCtrl"
        }
      }
    }).state("list.setting", {
      url: "/setting",
      views: {
        menuContent: {
          templateUrl: "views/menu/setting.html",
          controller: "MenuCtrlEtc"
        }
      }
    }).state("list.events", {
      url: "/events",
      views: {
        menuContent: {
          templateUrl: "views/menu/events.html",
          controller: "MenuEventCtrl"
        }
      }
    }).state("list.createEvent", {
      url: "/createEvent",
      views: {
        menuContent: {
          templateUrl: "views/event/create_event.html",
          controller: "CreateEventCtrl"
        }
      }
    }).state("list.createEventPc", {
      url: "/createEventPc",
      views: {
        menuContent: {
          templateUrl: "views/event/create_event_pc.html",
          controller: "CreateEventCtrlPc"
        }
      }
    }).state("list.createEventAndroid", {
      url: "/createEventAndroid",
      views: {
        menuContent: {
          templateUrl: "views/event/create_event_android.html",
          controller: "CreateEventCtrlAndroid"
        }
      }
    }).state("list.organizerSignUp", {
      url: "/organizerSignUp",
      views: {
        menuContent: {
          templateUrl: "views/login/organizer_signup.html",
          controller: "OrganizerSignCtrl"
        }
      }
    }).state("list.organizerLogin", {
      url: "/organizerLogin",
      views: {
        menuContent: {
          templateUrl: "views/login/organizerLoginFromEventPage.html",
          controller: "OrganizerLoginCtrl"
        }
      }
    }).state("list.termAndPolish", {
      url: "/termAndPolish",
      views: {
        menuContent: {
          templateUrl: "views/menu/term_and_polish.html",
          controller: "MenuCtrlEtc"
        }
      }
    }).state("list.report", {
      url: "/report",
      views: {
        menuContent: {
          templateUrl: "views/menu/report.html",
          controller: "MenuCtrlEtc"
        }
      }
    });
    $urlRouterProvider.otherwise("/");
  }).config(function($httpProvider) {
    $httpProvider.defaults.transformRequest = function(data) {
      if (data === undefined) {
        return data;
      }
      return $.param(data);
    };
    return $httpProvider.defaults.withCredentials = true;
  });

  angular.module("hiin").run(function($window, Migration, 　$rootScope, Util, $filter, $state) {

    /*
    $rootScope.$on "$stateChangeSuccess", (ev, to, toParams, from, fromParams) ->
      $rootScope.previousState = from.name
      $rootScope.currentState = to.name
      console.log "Previous state:" + $rootScope.previousState
      console.log "Current state:" + $rootScope.currentState
      return
     */
    var errorHandler, pushNotification, successHandler, tokenHandler;
    $rootScope.deviceType = "web";
    $rootScope.version = "0.1.0";
    $rootScope.ShowProfileImage = function(userInfo) {
      console.log(userInfo);
      $rootScope.imgUrl = $filter('profileImage')(userInfo.photoUrl);
      return Util.ShowModal($rootScope, 'profile_image');
    };
    $rootScope.Close = function() {
      $rootScope.modal.hide();
      return $rootScope.modal.remove();
    };
    $window.localDb = $window.openDatabase("hiin", "1.0", "hiin DB", 1000000);
    Migration.apply($window.localDb);
    pushNotification = '';
    $rootScope.deviceType = 'web';
    if (navigator.userAgent.indexOf('iPhone') > 0) {
      $rootScope.browser = 'ios';
    } else if (navigator.userAgent.indexOf('Android') > 0) {
      $rootScope.browser = 'android';
      $("body").height($("body").height());
    } else {
      $rootScope.browser = 'pc';
    }
    tokenHandler = function(result) {
      console.log("deviceToken:" + result);
      $rootScope.deviceToken = result;
      console.log("rootscope device token" + $rootScope.deviceToken);
    };
    errorHandler = function(err) {
      console.log("error:" + err);
    };
    successHandler = function(result) {
      console.log("result:" + result);
    };
    $window.onNotificationAPN = function(event) {
      var sleepFlg, snd;
      console.log('onNotificationAPN');
      console.log(event);
      sleepFlg = $window.localStorage.getItem("sleep");
      console.log(sleepFlg);
      if (sleepFlg === 'false' || event.foreground === '1') {
        console.log('cancel');
        return;
      }
      $rootScope.$broadcast("pushed", event);
      navigator.notification.alert(event.alert, 'Hiin');
      if (event.sound) {
        snd = new Media(event.sound);
        snd.play();
      }
      if (event.badge) {
        pushNotification.setApplicationIconBadgeNumber(successHandler, errorHandler, event.badge);
      }
    };
    $window.onNotification = function(e) {
      var sleepFlg;
      console.log('get notification');
      switch (e.event) {
        case "registered":
          if (e.regid.length > 0) {
            console.log("regID = " + e.regid);
            return $rootScope.deviceToken = e.regid;
          }
          break;
        case "message":
          sleepFlg = $window.localStorage.getItem("sleep");
          console.log(sleepFlg);
          if (sleepFlg === 'false' || e.foreground) {
            navigator.notification.alert(e.message, 'Hiin');
            console.log('cancel');
            return;
          }
          return $rootScope.$broadcast("pushed", e);
        case "error":
          return console.log("error");
        default:
          return console.log("unknown");
      }
    };
    return document.addEventListener("deviceready", function() {
      console.log("DeviceReady");
      pushNotification = window.plugins.pushNotification;
      cordova.getAppVersion().then(function(version) {
        $rootScope.version = version;
        return console.log(version);
      });
      if (typeof device === 'undefined' || device === null) {
        return $rootScope.deviceType = 'web';
      } else if (device.platform === "android" || device.platform === "Android") {
        console.log('device type is android');
        $rootScope.deviceType = 'android';
        return pushNotification.register(successHandler, errorHandler, {
          senderID: "605768570066",
          ecb: "window.onNotification"
        });
      } else {
        console.log('device type is ios');
        $rootScope.deviceType = 'ios';
        return pushNotification.register(tokenHandler, errorHandler, {
          badge: "true",
          sound: "true",
          alert: "true",
          ecb: "window.onNotificationAPN"
        });
      }
    });
  });

}).call(this);

// Generated by CoffeeScript 1.7.1
(function() {
  angular.module('services').factory('webDB', function() {});

}).call(this);

var PushNotification = function() {
};


// Call this to register for push notifications. Content of [options] depends on whether we are working with APNS (iOS) or GCM (Android)
PushNotification.prototype.register = function(successCallback, errorCallback, options) {
    if (errorCallback == null) { errorCallback = function() {}}

    if (typeof errorCallback != "function")  {
        console.log("PushNotification.register failure: failure parameter not a function");
        return
    }

    if (typeof successCallback != "function") {
        console.log("PushNotification.register failure: success callback parameter must be a function");
        return
    }

    cordova.exec(successCallback, errorCallback, "PushPlugin", "register", [options]);
};

// Call this to unregister for push notifications
PushNotification.prototype.unregister = function(successCallback, errorCallback, options) {
    if (errorCallback == null) { errorCallback = function() {}}

    if (typeof errorCallback != "function")  {
        console.log("PushNotification.unregister failure: failure parameter not a function");
        return
    }

    if (typeof successCallback != "function") {
        console.log("PushNotification.unregister failure: success callback parameter must be a function");
        return
    }

     cordova.exec(successCallback, errorCallback, "PushPlugin", "unregister", [options]);
};

    // Call this if you want to show toast notification on WP8
    PushNotification.prototype.showToastNotification = function (successCallback, errorCallback, options) {
        if (errorCallback == null) { errorCallback = function () { } }

        if (typeof errorCallback != "function") {
            console.log("PushNotification.register failure: failure parameter not a function");
            return
        }

        cordova.exec(successCallback, errorCallback, "PushPlugin", "showToastNotification", [options]);
    }
// Call this to set the application icon badge
PushNotification.prototype.setApplicationIconBadgeNumber = function(successCallback, errorCallback, badge) {
    if (errorCallback == null) { errorCallback = function() {}}

    if (typeof errorCallback != "function")  {
        console.log("PushNotification.setApplicationIconBadgeNumber failure: failure parameter not a function");
        return
    }

    if (typeof successCallback != "function") {
        console.log("PushNotification.setApplicationIconBadgeNumber failure: success callback parameter must be a function");
        return
    }

    cordova.exec(successCallback, errorCallback, "PushPlugin", "setApplicationIconBadgeNumber", [{badge: badge}]);
};

//-------------------------------------------------------------------

if(!window.plugins) {
    window.plugins = {};
}
if (!window.plugins.pushNotification) {
    window.plugins.pushNotification = new PushNotification();
}

if (typeof module != 'undefined' && module.exports) {
  module.exports = PushNotification;
}
/*
 * @author Ally Ogilvie
 * @copyright Wizcorp Inc. [ Incorporated Wizards ] 2014
 * @file - facebookConnectPlugin.js
 * @about - JavaScript interface for PhoneGap bridge to Facebook Connect SDK
 *
 *
 */

if (!window.cordova) {
// This should override the existing facebookConnectPlugin object created from cordova_plugins.js
    var facebookConnectPlugin = {

        getLoginStatus: function (s, f) {
            // Try will catch errors when SDK has not been init
            try {
                FB.getLoginStatus(function (response) {
                    s(response.status);
                });
            } catch (error) {
                if (!f) {
                    console.error(error.message);
                } else {
                    f(error.message);
                }
            }
        },

        showDialog: function (options, s, f) {
            
            if (!options.name) {
                options.name = "";
            }
            if (!options.caption) {
                options.caption = "";
            }
            if (!options.description) {
                options.description = "";
            }
            if (!options.link) {
                options.link = "";
            }
            if (!options.picture) {
                options.picture = "";
            }
            
            // Try will catch errors when SDK has not been init
            try {
                FB.ui({
                    method: options.method,
                    name: options.name,
                    caption: options.caption,
                    description: (
                        options.description
                    ),
                    link: options.link,
                    picture: options.picture
                },
                function (response) {
                    if (response && response.post_id) {
                        s({ post_id: response.post_id });
                    } else {
                        f(response);
                    }
                });
            } catch (error) {
                if (!f) {
                    console.error(error.message);
                } else {
                    f(error.message);
                }
            }
        },
        // Attach this to a UI element, this requires user interaction.
        login: function (permissions, s, f) {
            // JS SDK takes an object here but the native SDKs use array.
            var permissionObj = {};
            if (permissions && permissions.length > 0) {
                permissionObj.scope = permissions.toString();
            }
            
            FB.login(function (response) {
                if (response.authResponse) {
                    s(response);
                } else {
                    f(response.status);
                }
            }, permissionObj);
        },

        getAccessToken: function (s, f) {
            var response = FB.getAccessToken();
            if (!response) {
                if (!f) {
                    console.error("NO_TOKEN");
                } else {
                    f("NO_TOKEN");
                }
            } else {
                s(response);
            }
        },

        logout: function (s, f) {
            // Try will catch errors when SDK has not been init
            try {
                FB.logout( function (response) {
                    s(response);
                })
            } catch (error) {
                if (!f) {
                    console.error(error.message);
                } else {
                    f(error.message);
                }
            }
        },

        api: function (graphPath, permissions, s, f) {
            // JS API does not take additional permissions
            
            // Try will catch errors when SDK has not been init
            try {
                FB.api(graphPath, function (response) {
                    if (response.error) {
                        f(response);
                    } else {
                        s(response);
                    }
                });
            } catch (error) {
                if (!f) {
                    console.error(error.message);
                } else {
                    f(error.message);
                }
            }
        },

        // Browser wrapper API ONLY
        browserInit: function (appId, version) {
            if (!version) {
                version = "v2.0";
            }
            FB.init({
                appId      : appId,
                xfbml      : true,
                version    : version
            })
        }
    };
    
    // Bake in the JS SDK
    (function () {
        console.log("launching FB SDK")
        var e = document.createElement('script');
        e.src = document.location.protocol + '//connect.facebook.net/en_US/sdk.js';
        e.async = true;
        document.getElementById('fb-root').appendChild(e);
    }());

}

(function() {
  'use strict';
  angular.module('hiin').controller('ActivityCtrl', function($scope, $filter, $state, $rootScope, $location, $window, Util, socket, SocketClass, $modal) {
    var MakeActivityOptionObj, SendEmitActivity, thisEvent;
    thisEvent = JSON.parse($window.localStorage.getItem("thisEvent")).code;
    MakeActivityOptionObj = function(msgFlag) {
      var socketMyInfo;
      socketMyInfo = new SocketClass.socketClass('activity', null, 500, msgFlag);
      socketMyInfo.onCallback = function(data) {
        $scope.rank = data.rank;
        $scope.activitys = $filter('orderBy')(data.activity, 'lastMsg.created_at', 'reverse');
        console.log("activity");
        console.log(data);
      };
      return socketMyInfo;
    };
    SendEmitActivity = function(msgFlag) {
      return SocketClass.resSocket(MakeActivityOptionObj(msgFlag)).then(function(data) {
        return console.log('socket got activity');
      }, function(status) {
        return console.log("error");
      });
    };
    SendEmitActivity(true);
    $scope.$on("$destroy", function(event) {});
    $scope.myInfo = JSON.parse($window.localStorage.getItem('myInfo'));
    $scope.showRank = function() {
      var modalInstance;
      modalInstance = $modal.open({
        templateUrl: "views/dialog/ranking.html",
        scope: $scope
      });
      modalInstance.result.then((function(selectedItem) {
        $scope.modalInstance = null;
      }), function() {
        $scope.modalInstance = null;
      });
      return $scope.modalInstance = modalInstance;
    };
    $scope.ok = function() {
      $scope.modalInstance.close();
      return $scope.modalInstance = null;
    };
    $scope.ShowProfile = function(user) {
      var modalInstance;
      console.log(user);
      $scope.user = user;
      if (user.status === '0' || user.status === '2') {
        modalInstance = $modal.open({
          templateUrl: "views/dialog/user_card.html",
          scope: $scope
        });
        modalInstance.result.then((function(selectedItem) {
          $scope.modalInstance = null;
        }), function() {
          $scope.modalInstance = null;
        });
        return $scope.modalInstance = modalInstance;
      } else {
        return $scope.chatRoom(user);
      }
    };
    $scope.chatRoom = function(user) {
      console.log(user);
      if ($scope.modalInstance != null) {
        $scope.modalInstance.close();
      }
      return $state.go('list.single', {
        userId: user._id
      });
    };
    $scope.sayHi = function(user) {
      if (user.status === '0' || user.status === '2') {
        console.log('sayhi');
        socket.emit("hi", {
          targetId: user._id
        });
        if (user.status === '2') {
          socket.emit("readHi", {
            partner: user._id,
            code: thisEvent
          });
        }
      }
    };
    return $scope.$on("update activity", function(event, args) {
      console.log('update activity');
      return SendEmitActivity(false);
    });
  });

  angular.module('hiin').filter('convertMsg', function(Util) {
    return function(activity) {
      if (activity.lastMsg.type === 'hi') {
        return 'Sent \'HI\'!';
      } else {
        return Util.trimStr(activity.lastMsg.content, 40);
      }
    };
  });

  angular.module('hiin').filter('fromNow', function() {
    return function(time) {
      return moment(time).fromNow().replace('minute', 'min');
    };
  });

}).call(this);

(function() {
  'use strict';
  angular.module("hiin").controller("chatCtrl", function($rootScope, $ionicSideMenuDelegate, $scope, $filter, $window, socket, Util, $stateParams, $ionicScrollDelegate, $timeout) {
    var SendLoadMsgs, eventInfo, isIOS, keyboardHideEvent, keyboardShowEvent, listKey, loadMsgs, message, messageKey, partnerId, thisEvent, users;
    console.log('chat');
    console.dir($stateParams);
    partnerId = $stateParams.userId;
    $scope.clickSendStatus = false;
    $ionicSideMenuDelegate.canDragContent(false);
    if ($window.localStorage != null) {
      eventInfo = JSON.parse($window.localStorage.getItem("thisEvent"));
      thisEvent = eventInfo.code;
      $scope.myInfo = JSON.parse($window.localStorage.getItem('myInfo'));
      listKey = thisEvent + '_currentEventUserList';
      users = JSON.parse($window.localStorage.getItem(listKey));
      console.log(users);
      $scope.user = $filter('getUserById')(users, partnerId);
      $scope.partner = $scope.user.firstName;
      $scope.roomName = "CHAT WITH " + $scope.user.firstName;
    }
    messageKey = thisEvent + '_' + partnerId;
    $scope.scrollDelegate = null;
    if ($window.localStorage.getItem(messageKey)) {
      $scope.messages = JSON.parse($window.localStorage.getItem(messageKey));
    } else {
      $scope.messages = [];
    }
    SendLoadMsgs = function() {
      if ($scope.messages.length > 0) {
        console.log('----unread----');
        console.log('len:' + $scope.messages.length);
        return socket.emit('loadMsgs', {
          code: thisEvent,
          partner: partnerId,
          type: "personal",
          range: "unread",
          lastMsgTime: $scope.messages[$scope.messages.length - 1].created_at
        });
      } else {
        console.log('---call all---');
        return socket.emit('loadMsgs', {
          code: thisEvent,
          partner: partnerId,
          type: "personal",
          range: "all"
        });
      }
    };
    SendLoadMsgs();
    $scope.pullLoadMsg = function() {
      var lastTime;
      console.log('---pull load msg---');
      if ($scope.messages.length > 0) {
        lastTime = $scope.messages[0].created_at;
      } else {
        lastTime = new Date();
      }
      return socket.emit('loadMsgs', {
        code: thisEvent,
        type: "group",
        range: "pastThirty",
        firstMsgTime: lastTime
      });
    };
    loadMsgs = function(data) {
      var nextHeight, prevHeight, scrollTo, tempor;
      if (data.message) {
        data.message.forEach(function(item) {
          if (item.sender === $scope.myInfo._id) {
            item.sender_name = 'me';
          }
        });
      }
      if (data.type === 'personal' && data.range === 'all') {
        console.log('---all---');
        $scope.messages = data.message;
      } else if (data.type === 'personal' && data.range === 'unread') {
        console.log('---unread----');
        console.log(data);
        tempor = $scope.messages.concat(data.message);
        console.log(tempor);
        console.log('tmper len:' + tempor.length);
        $scope.messages = tempor;
      } else if (data.type === 'personal' && data.range === 'pastThirty') {
        console.log('---else---');
        tempor = data.message.reverse().concat($scope.messages);
        console.log(tempor);
        console.log('tmper len:' + tempor.length);
        console.log($("#messageList")[0].scrollHeight);
        prevHeight = $("#messageList")[0].scrollHeight;
        $scope.messages = tempor;
        $scope.$apply();
        console.log($("#messageList")[0].scrollHeight);
        nextHeight = $("#messageList")[0].scrollHeight;
        $scope.$broadcast('scroll.refreshComplete');
        scrollTo = nextHeight - prevHeight - $scope.scrollDelegate.scrollTo(0, scrollTo, false);
      }
      $scope.$apply();
      $window.localStorage.setItem(messageKey, JSON.stringify($scope.messages));
      $ionicScrollDelegate.scrollBottom();
    };
    message = function(data) {
      console.log('ms');
      console.log(data);
      if (data.status < 0) {
        return;
      }
      if (data.sender !== $stateParams.userId) {
        return;
      }
      $scope.messages.push(data);
      $window.localStorage.setItem(messageKey, JSON.stringify($scope.messages));
      $scope.newMsg = null;
      socket.emit("read", {
        msgId: data._id
      });
      if ($scope.bottom === false) {
        $scope.newMsg = data;
        $scope.newMsg.msg = Util.trimStr(data.content, 30);
      } else {
        $ionicScrollDelegate.scrollBottom();
      }
    };
    socket.on('loadMsgs', loadMsgs);
    socket.on("message", message);
    $scope.data = {};
    $scope.data.message = "";
    keyboardShowEvent = function(e) {
      console.log("Keyboard height is: " + e.keyboardHeight);
      if (document.activeElement.tagName === "BODY") {
        cordova.plugins.Keyboard.close();
        return;
      }
      window.scroll(0, 0);
      if (isIOS) {
        $scope.data.keyboardHeight = e.keyboardHeight;
      }
      $timeout((function() {
        $ionicScrollDelegate.scrollBottom(true);
      }), 200);
    };
    keyboardHideEvent = function(e) {
      console.log("Keyboard close");
      $scope.data.keyboardHeight = 0;
      $ionicScrollDelegate.resize();
    };
    window.addEventListener("native.keyboardshow", keyboardShowEvent, false);
    window.addEventListener("native.keyboardhide", keyboardHideEvent, false);
    ionic.DomUtil.ready(function() {
      if (window.cordova) {
        cordova.plugins && cordova.plugins.Keyboard && cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      }
      $("body").height("100%");
      $scope.bodyHeight = $("body").height();
      $scope.bottom = true;
      $scope.scrollDelegate = $ionicScrollDelegate.$getByHandle('myScroll');
      return $scope.scrollDelegate.getScrollView().onScroll = function() {
        if (($scope.scrollDelegate.getScrollView().__maxScrollTop - $scope.scrollDelegate.getScrollPosition().top) < 30) {
          $scope.bottom = true;
          if ($scope.newMsg !== null) {
            $scope.newMsg = null;
            return $ionicScrollDelegate.scrollBottom();
          }
        } else {
          return $scope.bottom = false;
        }
      };
    });
    $scope.$on("$destroy", function(event) {
      var len, temp;
      if (window.cordova) {
        cordova.plugins && cordova.plugins.Keyboard && cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false) && cordova.plugins.Keyboard.close();
      }
      if ($rootScope.deviceType === "android") {
        $("body").height($scope.bodyHeight);
      }
      $ionicSideMenuDelegate.canDragContent(true);
      socket.removeListener("loadMsgs", loadMsgs);
      socket.removeListener("message", message);
      window.removeEventListener("native.keyboardshow", keyboardShowEvent, false);
      window.removeEventListener("native.keyboardhide", keyboardHideEvent, false);
      temp = $scope.messages;
      len = temp.length;
      console.log('mlen:' + len);
      if (len > 30) {
        return window.localStorage[messageKey] = JSON.stringify(temp.slice(len - 30, temp.length));
      }
    });
    isIOS = ionic.Platform.isWebView() && ionic.Platform.isIOS();
    $scope.sendMessage = function() {
      var time;
      if ($scope.data.message === "") {
        return;
      }
      time = new Date();
      angular.element(':text').attr('clicksendstatus', 'true');
      socket.emit("message", {
        created_at: time,
        targetId: $stateParams.userId,
        message: $scope.data.message
      });
      $scope.messages.push({
        sender_name: 'me',
        content: $scope.data.message,
        created_at: time,
        thumbnailUrl: $scope.myInfo.thumbnailUrl
      });
      $scope.data.message = "";
      $window.localStorage.setItem(messageKey, JSON.stringify($scope.messages));
      return $ionicScrollDelegate.scrollBottom();
    };
    $scope.inputUp = function() {
      console.log('inputUp');
      angular.element(':text').attr('clicksendstatus', false);
      if ($rootScope.deviceType === 'web' && $rootScope.browser === 'ios') {
        $("body").height($(window).height() - 216);
        return $scope.ScrollToBottom();
      }
    };
    $scope.inputDown = function() {
      console.log('inputDown');
      if ($rootScope.deviceType === 'web' && $rootScope.browser === 'ios') {
        $("body").height("100%");
        $scope.ScrollToBottom();
      }
    };
    $scope.ShowProfile = function(sender) {
      $rootScope.ShowProfileImage($scope.user);
    };
    $scope.ScrollToBottom = function() {
      return $ionicScrollDelegate.scrollBottom();
    };
    $scope.dateChanged = function(msg_id) {
      var bmd, cmd, date_changed;
      if ($scope.messages.length > 0 && msg_id > 0) {
        bmd = new Date($scope.messages[msg_id - 1].created_at);
        cmd = new Date($scope.messages[msg_id].created_at);
        date_changed = bmd.getYear() !== cmd.getYear() || bmd.getMonth() !== cmd.getMonth() || bmd.getDate() !== cmd.getDate();
        return date_changed;
      } else {
        return msg_id === 0;
      }
    };
    $scope.$on("back", function(event, args) {
      $scope.data.keyboardHeight = 0;
      return $ionicScrollDelegate.resize();
    });
    return $scope.$on("Resume", function(event, args) {
      console.log('single chat resume');
      console.log(args);
      return SendLoadMsgs();
    });
  });

}).call(this);

(function() {
  angular.module("hiin").directive("ngDisplayYou", function($window) {
    return {
      link: function(scope, element, attrs) {
        console.log(attrs.sender);
        if (attrs.sender === 'me') {
          return element.show();
        } else {
          return element.hide();
        }
      }
    };
  });

  angular.module("hiin").directive("ngDot", function($window) {
    return {
      link: function(scope, element, attrs) {
        console.log(attrs.read);
        if (attrs.read === true) {
          return element.hide();
        } else {
          return element.show();
        }
      }
    };
  });

  angular.module("hiin").directive("ngChatInput", function($timeout) {
    return {
      restrict: "A",
      scope: {
        returnClose: "=",
        onReturn: "&",
        onFocus: "&",
        onBlur: "&"
      },
      link: function(scope, element, attr) {
        element.bind("focus", function(e) {
          console.log('focusss');
          if (scope.onFocus) {
            window.scroll(0, 0);
            $timeout(function() {
              scope.onFocus();
            });
          }
        });
        element.bind("blur", function(e) {
          console.log('blur');
          if (scope.onBlur) {
            $timeout(function() {});
            scope.onBlur();
            return;
          }
        });
        element.bind("keydown", function(e) {
          console.log('keydown');
          if (e.which === 13) {
            console.log('entered');
            if (scope.returnClose) {
              element[0].blur();
            }
            if (scope.onReturn) {
              $timeout(function() {
                scope.onReturn();
              });
            }
          }
        });
      }
    };
  });

  angular.module("hiin").directive("ngHiBtn", function() {
    return {
      link: function(scope, element, attrs) {
        console.log(attrs.histatus);
        if (attrs.histatus === '0') {
          console.log('btn status = hi');
          return element.addClass('btn-front');
        } else if (attrs.histatus === '1' || attrs.histatus === '3') {
          console.log('btn Status = in');
          return element.addClass('btn-back');
        }
      }
    };
  });

  angular.module("hiin").directive("ngInBtn", function() {
    return {
      link: function(scope, element, attrs) {
        console.log(attrs.histatus);
        if (attrs.histatus === '0' || attrs.histatus === '2') {
          console.log('btn status = hi');
          return element.addClass('btn-back');
        } else {
          console.log('btn Status = in');
          return element.addClass('btn-front');
        }
      }
    };
  });

  angular.module("hiin").directive("ngFlipBtn", function() {
    return {
      link: function(scope, element, attrs) {
        console.log(attrs.histatus);
        if (attrs.histatus === '0') {
          return element.bind('click', function() {
            element.addClass('btn-flip');
            return console.log('addclass');
          });
        } else if (attrs.histatus === '2') {
          return element.bind('click', function() {
            element.addClass('btn-flip');
            return console.log('addclass');
          });
        } else {
          return console.log('btn Status = in');
        }
      }
    };
  });

  angular.module("hiin").directive("ngProfileImage", function($compile, Util) {
    return {
      link: function(scope, element, attrs) {
        console.log('ngProfileImage　attrs');
        return attrs.$observe('source', function(val) {
          var newVal;
          newVal = val;
          if (val.indexOf('http') < 0) {
            newVal = Util.serverUrl() + "/" + val;
          }
          attrs.$set('src', newVal);
          return attrs.$set('ng-click', 'alert("test")');
        });
      }
    };
  });

}).call(this);

(function() {
  'use strict';
  angular.module('hiin').controller('CreateEventCtrl', function($scope, $window, $modal, Util, Host, $q, $state, $filter, $timeout) {
    $scope.InputStartDate = function() {
      var options;
      console.log('input start date');
      options = {
        date: new Date(),
        mode: "datetime"
      };
      return window.plugins.datePicker.show(options, function(date) {
        $scope.eventInfo.startDate = new Date(date);
        $scope.eventInfo.endDate = new Date(date);
        $scope.eventInfo.endDate.setTime($scope.eventInfo.endDate.getTime() + (2 * 60 * 60 * 1000));
        $scope.startDate = $filter('date')($scope.eventInfo.startDate, 'MMM d, y h:mm a');
        $scope.endDate = $filter('date')($scope.eventInfo.endDate, 'MMM d, y h:mm a');
        $scope.$apply();
      });
    };
    $scope.InputEndDate = function() {
      var options;
      console.log('input end date');
      if (typeof $scope.eventInfo.startDate === 'undefined' || ($scope.eventInfo.startDate == null)) {
        return;
      }
      options = {
        date: new Date(),
        mode: "datetime"
      };
      return window.plugins.datePicker.show(options, function(date) {
        $scope.eventInfo.endDate = new Date(date);
        $scope.endDate = $filter('date')($scope.eventInfo.endDate, 'MMM d, y h:mm a');
        $scope.$apply();
      });
    };
    $scope.eventInfo = {};
    $scope.CreateEvent = function(eventInfo) {
      var deferred;
      deferred = $q.defer();
      Util.authReq('post', 'event', eventInfo).success(function(data) {
        if (data.status >= '0') {
          console.log("$http.success");
          return deferred.resolve(data);
        } else {
          return deferred.reject(data);
        }
      }).error(function(error, status) {
        console.log("$http.error");
        return deferred.reject(status);
      });
      return deferred.promise;
    };
    return $scope.pubish = function() {
      var promise;
      if ($scope.eventInfo !== null) {
        if (typeof $scope.eventInfo.startDate === 'undefined' || ($scope.eventInfo.startDate == null)) {
          alert('input start date');
          return;
        }
        promise = $scope.CreateEvent($scope.eventInfo);
        $scope.message = 'created';
        Util.ShowModal($scope, 'create_or_loaded_event');
        $timeout((function() {
          return promise.then(function(data) {
            var modalInstance, thisEvent;
            console.log(data);
            thisEvent = $scope.eventInfo;
            thisEvent.code = data.eventCode;
            thisEvent.author = JSON.parse($window.localStorage.getItem('myInfo'))._id;
            $window.localStorage.setItem('thisEventOwner', 'true');
            $window.localStorage.setItem('thisEvent', JSON.stringify(thisEvent));
            $scope.modal.hide();
            $scope.modal.remove();
            $scope.eventCode = data.eventCode;
            modalInstance = $modal.open({
              templateUrl: "views/event/passcode_dialog.html",
              scope: $scope
            });
            return modalInstance.result.then(function() {
              return console.log('test');
            }, function() {
              return $state.go('list.userlists');
            });
          }, function(status) {
            console.log('error');
            $scope.modal.hide();
            $scope.modal.remove();
            return alert('err');
          });
        }), 1000);
      }
    };
  });

}).call(this);

(function() {
  'use strict';
  angular.module('hiin').controller('CreateEventCtrlAndroid', function($scope, $window, $modal, Util, Host, $q, $state, $filter, $timeout) {
    var SetDateTime, isValidDate;
    $scope.no_padding = '{padding-left:"0px"}';
    $scope.eventInfo = {};
    $scope.eventInfo.name = "";
    $scope.eventInfo.startDate = "";
    $scope.eventInfo.endDate = "";
    $scope.eventInfo.place = "";
    $scope.eventInfo.desc = "";

    /*
    Start혹은 end가 입력되었을때 초기값이 없다면, 입력된 값을 초기값으로 date생성,
    Time이 먼저 입력되었을때는, 오늘 날짜로 생성
     */
    SetDateTime = function() {
      $scope.startDate = $filter('date')($scope.eventInfo.startDate, 'MMM d, y');
      $scope.startTime = $filter('date')($scope.eventInfo.startDate, 'h:mm a');
      $scope.endDate = $filter('date')($scope.eventInfo.endDate, 'MMM d, y');
      $scope.endTime = $filter('date')($scope.eventInfo.endDate, 'h:mm a');
      return $scope.$apply();
    };
    isValidDate = function(d) {
      if (Object.prototype.toString.call(d) !== "[object Date]") {
        return false;
      }
      return !isNaN(d.getTime());
    };
    $scope.InputStartDate = function() {
      var options, tmpDate;
      console.log('input start date');
      tmpDate = "";
      if (!$scope.eventInfo.startDate) {
        tmpDate = new Date();
      } else {
        tmpDate = new Date($scope.eventInfo.startDate);
      }
      options = {
        date: tmpDate,
        mode: "date"
      };
      return window.plugins.datePicker.show(options, function(date) {
        console.log(date);
        if (!isValidDate(date)) {
          return;
        }
        tmpDate = "";
        if (!$scope.eventInfo.startDate) {
          tmpDate = new Date();
          tmpDate.setHours(18);
          tmpDate.setMinutes(0);
        } else {
          tmpDate = new Date($scope.eventInfo.startDate);
        }
        $scope.eventInfo.startDate = new Date(date);
        $scope.eventInfo.startDate.setHours(tmpDate.getHours());
        $scope.eventInfo.startDate.setMinutes(tmpDate.getMinutes());
        if (!$scope.eventInfo.endDate) {
          $scope.eventInfo.endDate = new Date($scope.eventInfo.startDate);
          $scope.eventInfo.endDate.setTime($scope.eventInfo.endDate.getTime() + (2 * 60 * 60 * 1000));
        }
        return SetDateTime();
      });
    };
    $scope.InputStartTime = function() {
      var options, tmpDate;
      console.log('input start time');
      tmpDate = "";
      if (!$scope.eventInfo.startDate) {
        tmpDate = new Date();
        tmpDate.setHours(18);
      } else {
        tmpDate = new Date($scope.eventInfo.startDate);
      }
      options = {
        date: tmpDate,
        mode: "time"
      };
      window.plugins.datePicker.show(options, function(date) {
        if (!isValidDate(date)) {
          return;
        }
        if (!$scope.eventInfo.startDate) {
          $scope.eventInfo.startDate = new Date();
        }
        $scope.eventInfo.startDate.setHours(date.getHours());
        $scope.eventInfo.startDate.setMinutes(date.getMinutes());
        if (!$scope.eventInfo.endDate) {
          $scope.eventInfo.endDate = new Date($scope.eventInfo.startDate);
          $scope.eventInfo.endDate.setTime($scope.eventInfo.endDate.getTime() + (2 * 60 * 60 * 1000));
        }
        return SetDateTime();
      });
    };
    $scope.InputEndDate = function() {
      var options, tmpDate;
      console.log('input end date');
      tmpDate = "";
      if (!$scope.eventInfo.endDate) {
        tmpDate = new Date();
        tmpDate.setHours(20);
      } else {
        tmpDate = new Date($scope.eventInfo.endDate);
      }
      options = {
        date: tmpDate,
        mode: "date"
      };
      return window.plugins.datePicker.show(options, function(date) {
        console.log(date);
        if (!isValidDate(date)) {
          return;
        }
        tmpDate = "";
        if (!$scope.eventInfo.endDate) {
          tmpDate = new Date();
          tmpDate.setHours(20);
          tmpDate.setMinutes(0);
        } else {
          tmpDate = new Date($scope.eventInfo.endDate);
        }
        $scope.eventInfo.endDate = new Date(date);
        $scope.eventInfo.endDate.setHours(tmpDate.getHours());
        $scope.eventInfo.endDate.setMinutes(tmpDate.getMinutes());
        if (!$scope.eventInfo.startDate) {
          $scope.eventInfo.startDate = new Date($scope.eventInfo.endDate);
          $scope.eventInfo.startDate.setTime($scope.eventInfo.startDate.getTime() - (2 * 60 * 60 * 1000));
        }
        return SetDateTime();
      });
    };
    $scope.InputEndTime = function() {
      var options, tmpDate;
      console.log('input end time');
      tmpDate = "";
      if (!$scope.eventInfo.endDate) {
        tmpDate = new Date();
        tmpDate.setHours(20);
      } else {
        tmpDate = new Date($scope.eventInfo.endDate);
      }
      options = {
        date: tmpDate,
        mode: "time"
      };
      window.plugins.datePicker.show(options, function(date) {
        if (!isValidDate(date)) {
          return;
        }
        if (!$scope.eventInfo.endDate) {
          $scope.eventInfo.endDate = new Date();
        }
        $scope.eventInfo.endDate.setHours(date.getHours());
        $scope.eventInfo.endDate.setMinutes(date.getMinutes());
        if (!$scope.eventInfo.startDate) {
          $scope.eventInfo.startDate = new Date($scope.eventInfo.endDate);
          $scope.eventInfo.startDate.setTime($scope.eventInfo.startDate.getTime() - (2 * 60 * 60 * 1000));
        }
        return SetDateTime();
      });
    };
    $scope.CreateEvent = function(eventInfo) {
      var deferred;
      deferred = $q.defer();
      Util.authReq('post', 'event', eventInfo).success(function(data) {
        if (data.status >= '0') {
          console.log("$http.success");
          return deferred.resolve(data);
        } else {
          return deferred.reject(data);
        }
      }).error(function(error, status) {
        console.log("$http.error");
        return deferred.reject(status);
      });
      return deferred.promise;
    };
    return $scope.pubish = function() {
      var promise;
      if ($scope.eventInfo !== null) {
        if (typeof $scope.eventInfo.startDate === 'undefined' || ($scope.eventInfo.startDate == null)) {
          alert('input start date');
          return;
        }
        promise = $scope.CreateEvent($scope.eventInfo);
        $scope.message = 'created';
        Util.ShowModal($scope, 'create_or_loaded_event');
        $timeout((function() {
          return promise.then(function(data) {
            var modalInstance, thisEvent;
            console.log(data);
            thisEvent = $scope.eventInfo;
            thisEvent.code = data.eventCode;
            thisEvent.author = JSON.parse($window.localStorage.getItem('myInfo'))._id;
            $window.localStorage.setItem('thisEventOwner', 'true');
            $window.localStorage.setItem('thisEvent', JSON.stringify(thisEvent));
            $scope.modal.hide();
            $scope.modal.remove();
            $scope.eventCode = data.eventCode;
            modalInstance = $modal.open({
              templateUrl: "views/event/passcode_dialog.html",
              scope: $scope
            });
            return modalInstance.result.then(function() {
              return console.log('test');
            }, function() {
              return $state.go('list.userlists');
            });
          }, function(status) {
            console.log('error');
            $scope.modal.hide();
            $scope.modal.remove();
            return alert('err');
          });
        }), 1000);
      }
    };
  });

}).call(this);

(function() {
  'use strict';
  angular.module('hiin').controller('CreateEventCtrlPc', function($scope, $window, $modal, Util, Host, $q, $state, $filter, $timeout) {
    var today;
    $scope.eventInfo = {};
    today = new Date();
    $scope.startDate = new Date();
    $scope.startTime = new Date();
    $scope.endDate = new Date();
    $scope.endTime = new Date();
    $scope.CreateEvent = function(eventInfo) {
      var deferred;
      deferred = $q.defer();
      Util.authReq('post', 'event', eventInfo).success(function(data) {
        if (data.status >= '0') {
          console.log("$http.success");
          return deferred.resolve(data);
        } else {
          return deferred.reject(data);
        }
      }).error(function(error, status) {
        console.log("$http.error");
        return deferred.reject(status);
      });
      return deferred.promise;
    };
    return $scope.pubish = function() {
      var promise;
      if ($scope.eventInfo !== null) {
        if (typeof $scope.eventInfo.startDate === 'undefined' || ($scope.eventInfo.startDate == null)) {
          alert('input start date');
          return;
        }
        promise = $scope.CreateEvent($scope.eventInfo);
        $scope.message = 'created';
        Util.ShowModal($scope, 'create_or_loaded_event');
        $timeout((function() {
          return promise.then(function(data) {
            var modalInstance, thisEvent;
            console.log(data);
            thisEvent = $scope.eventInfo;
            thisEvent.code = data.eventCode;
            thisEvent.author = JSON.parse($window.localStorage.getItem('myInfo'))._id;
            $window.localStorage.setItem('thisEventOwner', 'true');
            $window.localStorage.setItem('thisEvent', JSON.stringify(thisEvent));
            $scope.modal.hide();
            $scope.modal.remove();
            $scope.eventCode = data.eventCode;
            modalInstance = $modal.open({
              templateUrl: "views/event/passcode_dialog.html",
              scope: $scope
            });
            return modalInstance.result.then(function() {
              return console.log('test');
            }, function() {
              return $state.go('list.userlists');
            });
          }, function(status) {
            console.log('error');
            $scope.modal.hide();
            $scope.modal.remove();
            return alert('err');
          });
        }), 1000);
      }
    };
  });

}).call(this);

(function() {
  'use strict';
  angular.module('hiin').controller('eventInfoCtrl', function($scope, $rootScope, socket, $window, Util, $modal, $filter, $ionicNavBarDelegate) {
    var currentEvent;
    $scope.$on("$destroy", function(event) {
      socket.removeListener("currentEvent", currentEvent);
    });
    $scope.eventInfo = JSON.parse($window.localStorage.getItem("thisEvent"));
    $scope.startDate = $filter('date')(new Date($scope.eventInfo.startDate), 'MMM d, h:mm a');
    $scope.endDate = $filter('date')(new Date($scope.eventInfo.endDate), 'MMM d, h:mm a');
    if (($window.localStorage.getItem('thisEventOwner')) === 'true') {
      $scope.isOwner = true;
      $scope.right_link = 'edit_link';
    }
    $rootScope.Cancel = function() {
      $scope.editMode = false;
      socket.emit("currentEvent");
      $scope.right_link = 'edit_link';
      $ionicNavBarDelegate.showBackButton(true);
    };
    $scope.editMode = false;
    $scope.ToEditMode = function() {
      if ($scope.editMode === true) {
        Util.authReq('post', 'editEvent', $scope.eventInfo).success(function(data) {
          if (data.status >= '0') {
            console.log("$http.success");
            socket.emit("currentEvent");
          } else {

          }
          return console.log(data);
        }).error(function(error, status) {
          console.log("$http.error");
          return alert('status');
        });
        $scope.right_link = 'edit_link';
        return $ionicNavBarDelegate.showBackButton(true);
      } else {
        $scope.editMode = true;
        $scope.right_link = 'save_link';
        return $ionicNavBarDelegate.showBackButton(false);
      }
    };
    currentEvent = function(data) {
      console.log("currentEvent");
      console.log(data);
      $window.localStorage.setItem('thisEvent', JSON.stringify(data));
    };
    socket.on("currentEvent", currentEvent);
    $scope.InputStartDate = function() {
      var options;
      if ($scope.editMode === false) {
        return;
      }
      console.log('input start date');
      if ($window.localStorage.getItem("isPhoneGap")) {
        options = {
          date: new Date($scope.eventInfo.startDate),
          mode: "datetime"
        };
        return datePicker.show(options, function(date) {
          $scope.eventInfo.startDate = date;
          $scope.startDate = $filter('date')($scope.eventInfo.startDate, 'MMM d, h:mm a');
          $scope.$apply();
        });
      } else {
        $scope.eventInfo.startDate = new Date($scope.eventInfo.startDate);
        return $scope.startDate = $filter('date')($scope.eventInfo.startDate, 'MMM d, h:mm a');
      }
    };
    return $scope.InputEndDate = function() {
      var options;
      if ($scope.editMode === false) {
        return;
      }
      console.log('input end date');
      if ($window.localStorage.getItem("isPhoneGap")) {
        options = {
          date: new Date($scope.eventInfo.endDate),
          mode: "datetime"
        };
        return datePicker.show(options, function(date) {
          $scope.eventInfo.endDate = date;
          $scope.endDate = $filter('date')($scope.eventInfo.endDate, 'MMM d, h:mm a');
          $scope.$apply();
        });
      } else {
        $scope.eventInfo.endDate = new Date($scope.eventInfo.endDate);
        return $scope.endDate = $filter('date')($scope.eventInfo.endDate, 'MMM d, h:mm a');
      }
    };
  });

}).call(this);

(function() {
  'use strict';
  angular.module("hiin").controller("grpChatCtrl", function($ionicSideMenuDelegate, $scope, $state, $modal, $filter, $rootScope, $window, socket, Util, $location, $ionicScrollDelegate, $timeout) {
    var SendLoadMsgs, eventInfo, groupMessage, isIOS, keyboardHideEvent, keyboardShowEvent, listKey, loadMsgs, messageKey, notice, thisEvent, userListChange, users;
    console.log('grpChat');
    $scope.data = {};
    $scope.owner = {};
    $scope.data.message = "";
    $scope.amIOwner = false;
    $scope.clickSendStatus = false;
    $scope.scrollDelegate = null;
    $ionicSideMenuDelegate.canDragContent(false);
    if ($window.localStorage != null) {
      eventInfo = JSON.parse($window.localStorage.getItem("thisEvent"));
      thisEvent = eventInfo.code;
      $scope.myInfo = JSON.parse($window.localStorage.getItem('myInfo'));
      console.log($scope.myInfo);
      listKey = thisEvent + '_currentEventUserList';
      users = JSON.parse($window.localStorage.getItem(listKey));
      if (($window.localStorage.getItem('thisEventOwner')) === 'true') {
        $scope.amIOwner = true;
        if ($rootScope.regular_msg_flg == null) {
          $rootScope.regular_msg_flg = false;
        }
        if (users === null) {
          $scope.userNum = 0;
        } else {
          $scope.userNum = users.length;
        }
        $scope.owner = $scope.myInfo;
      } else {
        $scope.owner = $filter('getUserById')(users, eventInfo.author);
      }
    }
    messageKey = thisEvent + '_groupMessage';
    $scope.roomName = "GROUP CHAT";
    $scope.showNotice = true;
    if ($window.localStorage.getItem(messageKey)) {
      $scope.messages = JSON.parse($window.localStorage.getItem(messageKey));
    } else {
      $scope.messages = [];
    }
    SendLoadMsgs = function() {
      if ($scope.messages.length > 0) {
        console.log('----unread----');
        console.log('len:' + $scope.messages.length);
        return socket.emit('loadMsgs', {
          code: thisEvent,
          type: "group",
          range: "unread",
          lastMsgTime: $scope.messages[$scope.messages.length - 1].created_at
        });
      } else {
        console.log('---first entered---');
        return socket.emit('loadMsgs', {
          code: thisEvent,
          type: "group",
          range: "blank"
        });
      }
    };
    $scope.pullLoadMsg = function() {
      var lastTime;
      console.log('---pull load msg---');
      if ($scope.messages.length > 0) {
        lastTime = $scope.messages[0].created_at;
      } else {
        lastTime = new Date();
      }
      return socket.emit('loadMsgs', {
        code: thisEvent,
        type: "group",
        range: "pastThirty",
        firstMsgTime: lastTime
      });
    };
    SendLoadMsgs();
    userListChange = function(data) {
      console.log('userListChange');
      $scope.userNum = data.message.usersNumber;
    };
    notice = function(data) {
      console.log(data);
      data.created_at = data.regTime;
      data.type = 'notice';
      return groupMessage(data);
    };
    groupMessage = function(data) {
      console.log("grp chat,groupMessage");
      if ($scope.myInfo._id === data.sender) {
        data.sender_name = 'me';
      }
      $scope.messages.push(data);
      $window.localStorage.setItem(messageKey, JSON.stringify($scope.messages));
      $scope.newMsg = null;
      socket.emit("read", {
        msgId: data._id
      });
      if (data.sender_name === 'me') {
        $ionicScrollDelegate.scrollBottom();
      } else {
        console.log($scope.scrollDelegate.getScrollPosition());
        if ($scope.bottom === false) {
          $scope.newMsg = data;
          $scope.newMsg.msg = Util.trimStr(data.content, 30);
        } else {
          $ionicScrollDelegate.scrollBottom();
        }
      }
    };
    loadMsgs = function(data) {
      var nextHeight, prevHeight, scrollTo, tempor;
      if (data.message) {
        data.message.forEach(function(item) {
          if (item.type !== 'notice' && item.sender === $scope.myInfo._id) {
            item.sender_name = 'me';
          }
        });
      }
      if (data.type === 'group' && data.range === 'all') {
        console.log('---all---');
        $scope.messages = data.message;
        $ionicScrollDelegate.scrollBottom();
      } else if (data.type === 'group' && data.range === 'blank') {
        console.log('---blank----');
        console.log(data);
        console.log('--tmper--');
        tempor = $scope.messages.concat(data.message.reverse());
        console.log(tempor);
        console.log('tmper len:' + tempor.length);
        $scope.messages = tempor;
        $ionicScrollDelegate.scrollBottom();
      } else if (data.type === 'group' && data.range === 'unread') {
        console.log('---unread----');
        console.log(data);
        tempor = $scope.messages.concat(data.message);
        console.log(tempor);
        console.log('tmper len:' + tempor.length);
        $scope.messages = tempor;
        $ionicScrollDelegate.scrollBottom();
      } else if (data.type === 'group' && data.range === 'pastThirty') {
        console.log('---pastthirty---');
        console.log(data.message);
        console.log('length:' + data.message.length);
        tempor = data.message.reverse().concat($scope.messages);
        console.log(tempor);
        console.log('tmper len:' + tempor.length);
        console.log($("#messageList")[0].scrollHeight);
        prevHeight = $("#messageList")[0].scrollHeight;
        $scope.messages = tempor;
        $scope.$apply();
        console.log($("#messageList")[0].scrollHeight);
        nextHeight = $("#messageList")[0].scrollHeight;
        $scope.$broadcast('scroll.refreshComplete');
        scrollTo = nextHeight - prevHeight - 200;
        $scope.scrollDelegate.scrollTo(0, scrollTo, false);
      }
      $window.localStorage.setItem(messageKey, JSON.stringify($scope.messages));
    };
    socket.on("userListChange", userListChange);
    socket.on("groupMessage", groupMessage);
    socket.on('loadMsgs', loadMsgs);
    socket.on('notice', notice);
    keyboardShowEvent = function(e) {
      console.log("Keyboard height is: " + e.keyboardHeight);
      if (document.activeElement.tagName === "BODY") {
        cordova.plugins.Keyboard.close();
        return;
      }
      window.scroll(0, 0);
      if (isIOS) {
        $scope.data.keyboardHeight = e.keyboardHeight;
      }
      $timeout((function() {
        $ionicScrollDelegate.scrollBottom(true);
      }), 200);
    };
    keyboardHideEvent = function(e) {
      console.log("Keyboard close");
      $scope.data.keyboardHeight = 0;
      $ionicScrollDelegate.resize();
    };
    window.addEventListener("native.keyboardshow", keyboardShowEvent, false);
    window.addEventListener("native.keyboardhide", keyboardHideEvent, false);
    ionic.DomUtil.ready(function() {
      console.log('ready');
      if (window.cordova) {
        cordova.plugins && cordova.plugins.Keyboard && cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      }
      $("body").height("100%");
      $scope.bodyHeight = $("body").height();
      $scope.bottom = true;
      $scope.scrollDelegate = $ionicScrollDelegate.$getByHandle('myScroll');
      $scope.maxScrollTop = 0;
      return $scope.scrollDelegate.getScrollView().onScroll = function() {
        if (($scope.scrollDelegate.getScrollView().__maxScrollTop - $scope.scrollDelegate.getScrollPosition().top) < 30) {
          $scope.bottom = true;
          if ($scope.newMsg !== null) {
            $scope.newMsg = null;
            return $ionicScrollDelegate.scrollBottom();
          }
        } else {
          return $scope.bottom = false;
        }

        /*
        console.log $scope.scrollDelegate.getScrollPosition().top
        console.log $scope.bodyHeight
        console.log $scope.scrollDelegate.getScrollView().__maxScrollTop
        console.log $scope.scrollDelegate.getScrollView().__contentHeight
         */
      };
    });
    $scope.$on("$destroy", function(event) {
      var len, temp;
      if (window.cordova) {
        cordova.plugins && cordova.plugins.Keyboard && cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false) && cordova.plugins.Keyboard.close();
      }
      if ($rootScope.deviceType === "android") {
        $("body").height($scope.bodyHeight);
      }
      socket.removeListener("userListChange", userListChange);
      socket.removeListener("groupMessage", groupMessage);
      socket.removeListener('loadMsgs', loadMsgs);
      window.removeEventListener("native.keyboardshow", keyboardShowEvent, false);
      window.removeEventListener("native.keyboardhide", keyboardHideEvent, false);
      temp = $scope.messages;
      len = temp.length;
      console.log('mlen:' + len);
      if (len > 30) {
        window.localStorage[messageKey] = JSON.stringify(temp.slice(len - 30, temp.length));
      }
      return $ionicSideMenuDelegate.canDragContent(true);
    });
    isIOS = ionic.Platform.isWebView() && ionic.Platform.isIOS();
    $scope.sendMessage = function() {
      var time;
      time = new Date();
      angular.element(':text').attr('clicksendstatus', 'true');
      console.log('---------------------');
      console.log(angular.element(':text').attr('clicksendstatus'));
      console.log(angular.element(':text'));
      console.log('---------------------');
      if ($scope.data.message === "") {
        return;
      }
      if ($scope.amIOwner === true && $rootScope.regular_msg_flg === false) {
        socket.emit("notice", {
          created_at: time,
          message: $scope.data.message
        });
      } else {
        socket.emit("groupMessage", {
          created_at: time,
          message: $scope.data.message
        });
      }
      return $scope.data.message = "";
    };
    $scope.inputUp = function() {
      console.log('inputUp');
      if ($rootScope.deviceType === 'web' && $rootScope.browser === 'ios') {
        $("body").height($(window).height() - 216);
        $scope.ScrollToBottom();
      }
    };
    $scope.inputDown = function() {
      console.log('inputDown');
      if ($rootScope.deviceType === 'web' && $rootScope.browser === 'ios') {
        $("body").height("100%");
        $scope.ScrollToBottom();
      }
    };
    $scope.toggleOwnerMsg = function() {
      $rootScope.regular_msg_flg = !$rootScope.regular_msg_flg;
      if ($rootScope.regular_msg_flg === true) {
        $scope.popupMessage = "Send as a regular chat message";
      } else {
        $scope.popupMessage = "Send as a notice to the group";
      }
      $scope.showingMsg = true;
      if ($scope.timer != null) {
        $timeout.cancel($scope.timer);
      }
      return $scope.timer = $timeout((function() {
        $scope.showingMsg = false;
      }), 2000);
    };
    $scope.ShowProfile = function(sender) {
      var modalInstance, user;
      listKey = thisEvent + '_currentEventUserList';
      console.log(listKey);
      users = JSON.parse($window.localStorage.getItem(listKey));
      console.log(users);
      user = $filter('getUserById')(users, sender);
      if (user === null) {
        return;
      }
      console.log(user);
      $scope.user = user;
      modalInstance = $modal.open({
        templateUrl: "views/dialog/user_card.html",
        scope: $scope
      });
      modalInstance.result.then((function(selectedItem) {
        $scope.modalInstance = null;
      }), function() {
        $scope.modalInstance = null;
      });
      return $scope.modalInstance = modalInstance;
    };
    $scope.sayHi = function(user) {
      if (user.status === '0' || user.status === '2') {
        console.log('sayhi');
        socket.emit("hi", {
          targetId: user._id
        });
        if (user.status === '2') {
          socket.emit("readHi", {
            partner: user._id,
            code: thisEvent
          });
        }
      }
    };
    $scope.chatRoom = function(user) {
      if ($scope.modalInstance != null) {
        $scope.modalInstance.close();
      }
      return $location.url('/list/userlists/' + user._id);
    };
    $scope.DialogClose = function() {
      return $scope.modalInstance.close();
    };
    $scope.ScrollToBottom = function() {
      return $ionicScrollDelegate.scrollBottom();
    };
    $scope.dateChanged = function(msg_id) {
      var bmd, cmd, date_changed;
      if ($scope.messages.length > 0 && msg_id > 0) {
        bmd = new Date($scope.messages[msg_id - 1].created_at);
        cmd = new Date($scope.messages[msg_id].created_at);
        date_changed = bmd.getYear() !== cmd.getYear() || bmd.getMonth() !== cmd.getMonth() || bmd.getDate() !== cmd.getDate();
        return date_changed;
      } else {
        return msg_id === 0;
      }
    };
    $scope.$on("back", function(event, args) {
      $scope.data.keyboardHeight = 0;
      return $ionicScrollDelegate.resize();
    });
    return $scope.$on("Resume", function(event, args) {
      console.log('group chat resume');
      console.log(args);
      return SendLoadMsgs();
    });
  });

}).call(this);

(function() {
  'use strict';
  angular.module('hiin').controller('ListCtrl', function($route, $filter, $rootScope, $scope, $window, Util, socket, SocketClass, $modal, $state, $location, $ionicNavBarDelegate, $timeout) {
    var MakeCurrentEventUserListOptionObj, MakeMyInfoOptionObj, MakeNoticeObj, SaveUsersToLocalStorage, SendEmitCurrentEventUserList, SendEmitMyInfo, eventInfo, hi, hiMe, listKey, message, myInfo, pendingHi, tempList, thisEvent, unReadCount, unReadCountGroup, userListChange;
    $rootScope.selectedItem = 2;
    MakeMyInfoOptionObj = function() {
      var socketMyInfo;
      socketMyInfo = new SocketClass.socketClass('myInfo', null, 1500, true);
      socketMyInfo.onCallback = function(data) {
        console.log("list myInfo");
        console.log(data);
        $window.localStorage.setItem('myInfo', JSON.stringify(data));
        $scope.myId = new Array();
        $scope.myId.author = JSON.parse($window.localStorage.getItem('myInfo'))._id;
      };
      return socketMyInfo;
    };
    SendEmitMyInfo = function() {
      return SocketClass.resSocket(MakeMyInfoOptionObj()).then(function(data) {
        return console.log('socket got myInfo');
      }, function(status) {
        console.log("error");
        return alert('error get my info');
      });
    };
    myInfo = JSON.parse($window.localStorage.getItem('myInfo'));
    if (myInfo == null) {
      SendEmitMyInfo();
    }
    MakeNoticeObj = function() {
      var socketMyInfo;
      socketMyInfo = new SocketClass.socketClass('unReadCountNotice', null, 0, false);
      socketMyInfo.onCallback = function(data) {
        console.log("menu unReadCountNotice");
        console.log(data);
        if (data.count > 0) {
          $rootScope.noticeFlg = true;
        }
      };
      return socketMyInfo;
    };
    if (($window.localStorage.getItem('thisEventOwner')) !== 'true') {
      SocketClass.resSocket(MakeNoticeObj()).then(function(data) {
        return console.log('socket got notice');
      }, function(status) {
        return console.log("error");
      });
    }
    ionic.DomUtil.ready(function() {
      return $ionicNavBarDelegate.showBackButton(false);
    });
    if ($window.localStorage != null) {
      eventInfo = JSON.parse($window.localStorage.getItem("thisEvent"));
      if (eventInfo != null) {
        thisEvent = eventInfo.code;
        $scope.eventName = eventInfo.name;
      } else {
        $scope.back = function() {
          console.log('back');
          $scope.modal.hide();
          $scope.modal.remove();
          return $window.history.back();
        };
        $scope.message = '<p> You have not entered an event. <p>Please go back <p>and <p>type passcode to join an event.';
        Util.ShowModal($scope, 'no_event');
        return;
      }
      console.log('list this event is ' + thisEvent);
    }
    $scope.ShowPrivacyFreeDialog = function() {
      var modalInstance;
      if ($window.localStorage.getItem('flg_show_privacy_dialog')) {
        return;
      }
      modalInstance = $modal.open({
        templateUrl: "views/dialog/privacy_free.html",
        scope: $scope
      });
      modalInstance.result.then((function(selectedItem) {
        $scope.modalInstance = null;
      }), function() {
        $scope.modalInstance = null;
      });
      $scope.modalInstance = modalInstance;
      return $window.localStorage.setItem('flg_show_privacy_dialog', true);
    };
    $scope.DialogClose = function() {
      return $scope.modalInstance.close();
    };
    $scope.ShowPrivacyFreeDialog();
    SaveUsersToLocalStorage = function() {
      return $window.localStorage.setItem(listKey, JSON.stringify($scope.users));
    };
    MakeCurrentEventUserListOptionObj = function() {
      var socketMyInfo;
      socketMyInfo = new SocketClass.socketClass('currentEventUserList', null, 100, true);
      socketMyInfo.onCallback = function(data) {
        var sortedData;
        console.log(data);
        console.log("list currentEventUserList");
        console.log('listKey is ' + listKey);
        if (data.length > 0) {
          sortedData = $filter('orderBy')(data, 'rank');
          $window.localStorage.setItem(listKey, JSON.stringify(sortedData));
          $scope.users = sortedData;
          console.dir($scope.users);
        }
      };
      return socketMyInfo;
    };
    SendEmitCurrentEventUserList = function() {
      SocketClass.resSocket(MakeCurrentEventUserListOptionObj()).then(function(data) {
        return console.log('socket got user list');
      }, function(status) {
        return console.log("error");
      });
    };
    listKey = thisEvent + '_currentEventUserList';
    tempList = $window.localStorage.getItem(listKey);
    if (tempList && tempList !== '[]') {
      $scope.users = JSON.parse(tempList);
      $scope.users = $filter('orderBy')($scope.users, 'rank');
      console.log("Get Users from local Storage");
      console.dir($scope.users);
    } else {
      $scope.users = [];
      SendEmitCurrentEventUserList();
    }
    socket.emit("unReadCount");
    socket.emit("unReadCountGroup");
    $scope.$on("$destroy", function(event) {
      socket.removeListener("unReadCount", unReadCount);
      socket.removeListener("unReadCountGroup", unReadCountGroup);
      socket.removeListener("userListChange", userListChange);
      socket.removeListener("hi", hi);
      socket.removeListener("hiMe", hiMe);
      socket.removeListener("pendingHi", pendingHi);
      socket.removeListener("message", message);
    });
    unReadCount = function(data) {
      console.log('-######-unread count--#####-');
      console.log(data);
      $scope.unreadActivity = data.count;
    };
    unReadCountGroup = function(data) {
      console.log('-########-unread count for group--#######-');
      console.log(data);
      $scope.unreadGroup = data.count;
    };
    userListChange = function(data) {
      console.log('userListChange');
      console.log(data);
    };
    hi = function(data) {
      var modalInstance, user;
      console.log('on hi');
      $scope.sendHi = data.fromName;
      modalInstance = $modal.open({
        templateUrl: "views/list/hi_modal.html",
        scope: $scope
      });
      modalInstance.result.then((function(selectedItem) {}), function() {
        $scope.modalInstance = null;
      });
      $scope.modalInstance = modalInstance;
      user = $filter('getUserById')($scope.users, data.from);
      if (user.status === "0") {
        user.status = "2";
        user.unread = true;
        SaveUsersToLocalStorage();
      }
    };
    hiMe = function(data) {
      console.log('on hiMe');
    };
    pendingHi = function(data) {
      console.log('on pendinghi');
      console.log("list pedinghi");
      console.log(data.status);
      if (data.status !== "0") {
        console.log({
          'error': data.status
        });
        return;
      }
    };
    message = function(data) {
      var user;
      console.log('private message in list');
      console.log(data);
      user = $filter('getUserById')($scope.users, data.sender);
      if (user === null) {
        return;
      }
      if (user.unread === false) {
        user.unread = true;
        SaveUsersToLocalStorage();
      }
    };
    socket.on("unReadCount", unReadCount);
    socket.on("unReadCountGroup", unReadCountGroup);
    socket.on("userListChange", userListChange);
    socket.on("hi", hi);
    socket.on("hiMe", hiMe);
    socket.on("pendingHi", pendingHi);
    socket.on("message", message);
    $scope.chatRoom = function(user) {
      if ($scope.modalInstance != null) {
        $scope.modalInstance.close();
      }
      if (user.unread === true) {
        console.log('CancelRedPoint');
        user.unread = false;
        SaveUsersToLocalStorage();
      }
      return $location.url('/list/userlists/' + user._id);
    };
    $scope.sayHi = function(user) {
      console.log('list say hi');
      if (user.status === '0' || user.status === '2') {
        console.log('sayhi');
        socket.emit("hi", {
          targetId: user._id
        });
        if (user.status === '2') {
          socket.emit("readHi", {
            partner: user._id,
            code: thisEvent
          });
        }
      }
      if (user.unread === true) {
        console.log('CancelRedPoint');
        user.unread = false;
        SaveUsersToLocalStorage();
      }
    };
    $scope.activity = function() {
      return $location.url('/list/activity');
    };
    $scope.groupChat = function() {
      return $location.url('/list/groupChat');
    };
    $scope.info = function() {
      return $location.url('/list/eventInfo');
    };
    $scope.imagePath = Util.serverUrl() + "/";
    $scope.ShowProfile = function(user) {
      var modalInstance;
      console.log(user);
      $scope.user = user;
      modalInstance = $modal.open({
        templateUrl: "views/dialog/user_card.html",
        scope: $scope
      });
      modalInstance.result.then((function(selectedItem) {
        $scope.modalInstance = null;
      }), function() {
        $scope.modalInstance = null;
      });
      return $scope.modalInstance = modalInstance;
    };
    $scope.CloseDialog = function() {
      return $scope.modalInstance.close();
    };
    $scope.GotoNotice = function() {
      return $state.go('list.notice');
    };
    return $scope.$on("Resume", function(event, args) {
      console.log('list resume');
      console.log(args);
      return SendEmitCurrentEventUserList();
    });
  });

}).call(this);

(function() {
  'use strict';
  angular.module('hiin').controller('LoginCtrl', function($rootScope, $scope, $window, $state, Util, $q, $timeout) {
    var CheckEvent, CheckToken, FacebookLogin, LoginWithFacebook, disconnect_flg, eventInfo, token;
    disconnect_flg = $window.localStorage.getItem("socket_disconnect");
    if (disconnect_flg === '1') {
      $window.localStorage.removeItem('socket_disconnect');
      window.location.href = unescape(window.location.pathname);
    }
    CheckToken = function(token) {
      var deferred, sendData;
      deferred = $q.defer();
      sendData = {};
      sendData.Token = token;
      Util.makeReq('post', 'IsAvailableToken', sendData).success(function(data) {
        console.log(data);
        if (data.status === '0') {
          deferred.resolve('ok');
        } else {
          deferred.reject('error');
        }
      }).error(function(data, status) {
        return deferred.reject('error');
      });
      return deferred.promise;
    };
    CheckEvent = function(eventCode) {
      var deferred, sendData;
      deferred = $q.defer();
      sendData = {};
      sendData.code = eventCode;
      Util.makeReq('post', 'IsAvailableEvent', sendData).success(function(data) {
        console.log(data);
        if (data.status === '0') {
          deferred.resolve('ok');
        } else {
          deferred.reject('error');
        }
      }).error(function(data, status) {
        return deferred.reject('error');
      });
      return deferred.promise;
    };
    if ($window.localStorage != null) {
      token = $window.localStorage.getItem("auth_token");
      eventInfo = $window.localStorage.getItem("thisEvent");
      if ((token != null) && (eventInfo != null)) {
        CheckToken(token).then(function(response) {
          var eventCode;
          console.log('token check ok');
          eventCode = JSON.parse(eventInfo).code;
          return CheckEvent(eventCode);
        }).then(function(response) {
          var confirmData;
          confirmData = {
            code: JSON.parse(eventInfo).code
          };
          return Util.ConfirmEvent(confirmData);
        }).then(function(response) {
          console.log('goto events');
          return $state.go('list.events');
        }, function(response) {
          return Util.ClearLocalStorage();
        });
      }
    }
    FacebookLogin = function() {
      var deferred;
      deferred = $q.defer();
      facebookConnectPlugin.login(["email"], (function(response) {
        if (response.status === 'connected') {
          deferred.resolve(response);
        } else {
          deferred.reject(response);
        }
      }), function(response) {
        console.log(JSON.stringify(response));
        deferred.reject(response);
      });
      return deferred.promise;
    };
    LoginWithFacebook = function(sendData) {
      var deferred;
      deferred = $q.defer();
      Util.makeReq('post', 'loginWithFacebook', sendData).success(function(response) {
        if (response.status === '0') {
          deferred.resolve(response);
        } else {
          deferred.reject(response);
        }
      }).error(function(response, status) {
        return deferred.reject(response);
      });
      return deferred.promise;
    };
    $scope.facebookLogin = function() {
      if (!window.cordova) {
        facebookConnectPlugin.browserInit('684817121572800');
      }
      return FacebookLogin().then(function(response) {
        var accessToken, sendData;
        accessToken = response.authResponse.accessToken;
        console.log(accessToken);
        sendData = {};
        sendData.accessToken = accessToken;
        sendData.device = $rootScope.deviceType;
        sendData.deviceToken = $rootScope.deviceToken;
        console.log(sendData);
        return LoginWithFacebook(sendData);
      }).then(function(response) {
        Util.ClearLocalStorage();
        $window.localStorage.setItem("auth_token", response.Token);
        $window.localStorage.setItem("id_type", 'facebook');
        return $state.go('list.events');
      }, function(response) {
        return alert('error');
      });
    };
    $scope.signin = function() {
      return $state.go('signin');
    };
    return $scope.organizerLogin = function() {
      return $state.go('organizerLogin');
    };
  });

}).call(this);

(function() {
  'use strict';
  angular.module('hiin').controller('MenuCtrl', function($rootScope, $scope, Util, $window, socket, SocketClass, $state, $stateParams, $location, $ionicNavBarDelegate, $modal, $timeout, $filter) {
    var GetUserById, MakeCurrentEventUserListOptionObj, SendEmitCurrentEventUserList, ShowHeader, ShowProfile, groupMessage, hi, hiMe, message, myInfo, notice, pendingHi, userListChange;
    console.log('called menu Ctrl');

    /*
    액티비티 갱신
    1. 하이 받았을때
    2. 하이할때
    3. 메세지 받았을때
    4. 유저가 추가되었을때
     */
    myInfo = JSON.parse($window.localStorage.getItem('myInfo'));
    $window.localStorage.setItem("sleep", false);
    $rootScope.noticeFlg = false;
    $rootScope.onResume = function() {
      console.log("On Resume");
      $window.localStorage.setItem("sleep", false);
      socket.emit("resume");
      console.log($state.current.name);
      switch ($state.current.name) {
        case 'list.groupChat':
          console.log('group chat');
          $scope.$broadcast("Resume", null);
          break;
        case 'list.single':
          console.log('list single');
          $scope.$broadcast("Resume", null);
          break;
        case 'list.userlists':
          console.log('list');
          $scope.$broadcast("Resume", null);
      }
    };
    $rootScope.onPause = function() {
      console.log("On Pause");
      $window.localStorage.setItem("sleep", true);
      socket.disconnect();
    };
    if (typeof $rootScope.AddFlagPauseHandler === 'undefined' || $rootScope.AddFlagPauseHandler === false) {
      document.addEventListener("resume", $rootScope.onResume, false);
      document.addEventListener("pause", $rootScope.onPause, false);
      $rootScope.AddFlagPauseHandler = true;
    }
    $rootScope.goBack = function() {
      $rootScope.$broadcast("back");
      return window.history.back();
    };
    $scope.msgHeaderShow = false;
    $scope.CloseHeaderMsg = function() {
      return $scope.msgHeaderShow = false;
    };
    ShowHeader = function(msg) {
      var sleepFlg;
      sleepFlg = $window.localStorage.getItem("sleep");
      console.log(sleepFlg);
      if (sleepFlg === 'true') {
        console.log('dont show header');
        return;
      }
      if ($state.current.name === 'list.organizerSignUp') {
        return;
      }
      $scope.CloseHeaderMsg();
      $scope.headerMsg = msg;
      $scope.msgHeaderShow = true;
      $timeout((function() {
        return $scope.CloseHeaderMsg();
      }), 4000);
    };
    ShowProfile = function() {
      var modalInstance;
      $scope.CloseHeaderMsg();
      modalInstance = $modal.open({
        templateUrl: "views/dialog/user_card.html",
        scope: $scope
      });
      modalInstance.result.then((function(selectedItem) {
        $scope.modalInstance = null;
      }), function() {
        $scope.modalInstance = null;
      });
      return $scope.modalInstance = modalInstance;
    };
    GetUserById = function(id) {
      var eventInfo, listKey, user, users;
      eventInfo = JSON.parse($window.localStorage.getItem("thisEvent"));
      listKey = eventInfo.code + '_currentEventUserList';
      users = JSON.parse($window.localStorage.getItem(listKey));
      user = $filter('getUserById')(users, id);
      return user;
    };
    message = function(data) {
      var msg, shortMsg, user;
      console.log('private message in menu');
      console.log(data);
      socket.emit("unReadCount");
      $scope.$broadcast("update activity", data);
      if (typeof $state.params.userId !== 'undefined' && $state.params.userId === data.sender) {
        return;
      }
      user = GetUserById(data.sender);
      if (user.unread === false) {
        SendEmitCurrentEventUserList();
      }
      $scope.msgHeaderClass = 'private_msg_push';
      if (user.status === '0' || user.status === '2') {
        msg = '<p> ' + data.sender_name + ' has sent a message.' + '<p> Click to say \'HI\' and join th chat.';
        ShowHeader(msg);
        $scope.user = user;
        return $scope.headerClickAction = ShowProfile;
      } else {
        shortMsg = Util.trimStr(data.content, 30);
        msg = '<p> ' + data.sender_name + ' has sent a message.' + "<p>\'" + shortMsg + "\'";
        ShowHeader(msg);
        return $scope.headerClickAction = function() {
          $scope.CloseHeaderMsg();
          history.pushState(null, null, '#/list/userlists');
          return $state.go('list.single', {
            userId: data.sender
          });
        };
      }
    };
    groupMessage = function(data) {
      var msg;
      console.log('group message in menu');
      console.log(data);
      socket.emit("unReadCountGroup");
      if ($state.current.name === 'list.groupChat') {
        return;
      }
      msg = '<p> GroupMessage: ' + data.content + '<p> Click to move';
      $scope.msgHeaderClass = 'private_msg_push';
      ShowHeader(msg);
      return $scope.headerClickAction = function() {
        $scope.CloseHeaderMsg();
        history.pushState(null, null, '#/list/userlists');
        return $state.go('list.groupChat');
      };
    };
    notice = function(data) {
      var msg;
      console.log('got notice');
      console.log(data);
      socket.emit("unReadCountNotice");
      if ($state.current.name === 'list.notice' || $state.current.name === 'list.groupChat') {
        return;
      }
      if (($window.localStorage.getItem('thisEventOwner')) !== 'true') {
        $rootScope.noticeFlg = true;
      }
      if (myInfo._id === data.from) {
        return;
      }
      msg = '<p>\'' + data.message + '\'<p>Click to check the detail of notice.';
      $scope.msgHeaderClass = 'notice_push';
      ShowHeader(msg);
      $scope.headerClickAction = function() {
        $scope.CloseHeaderMsg();
        history.pushState(null, null, '#/list/userlists');
        return $state.go('list.notice');
      };
    };
    MakeCurrentEventUserListOptionObj = function() {
      var socketMyInfo;
      console.log('make event user list obj');
      socketMyInfo = new SocketClass.socketClass('currentEventUserList', null, 100, false);
      socketMyInfo.onCallback = function(data) {
        var eventInfo, listKey, sortedData;
        console.log("menu currentEventUserList");
        eventInfo = JSON.parse($window.localStorage.getItem("thisEvent"));
        listKey = eventInfo.code + '_currentEventUserList';
        console.log("listKey is " + listKey);
        if (data.length > 0) {
          sortedData = $filter('orderBy')(data, 'rank');
          $window.localStorage.setItem(listKey, JSON.stringify(sortedData));
        }
        console.dir(data);
      };
      return socketMyInfo;
    };
    SendEmitCurrentEventUserList = function() {
      var eventInfo;
      eventInfo = JSON.parse($window.localStorage.getItem("thisEvent"));
      if (eventInfo === null) {
        return;
      }
      SocketClass.resSocket(MakeCurrentEventUserListOptionObj()).then(function(data) {
        return console.log('socket got user list');
      }, function(status) {
        return console.log("error");
      });
    };

    /*
    1. 유저가 추가되었을때
    2. 하이를 받았을때,
    3. 내가 하이를 했을때
    유저 정보를 갱신하여 로컬 스토리지에 저장한다.
     */
    $scope.sayHi = function(user) {
      var eventInfo;
      console.log('menu say hi');
      if (user.status === '0' || user.status === '2') {
        console.log('sayhi');
        socket.emit("hi", {
          targetId: user._id
        });
        if (user.status === '2') {
          eventInfo = JSON.parse($window.localStorage.getItem("thisEvent"));
          socket.emit("readHi", {
            partner: user._id,
            code: eventInfo.code
          });
        }
      }
    };
    hi = function(data) {
      var eventInfo, listKey, msg, subString, user, users;
      console.log('got hi in menu');
      console.log(data);
      if ($state.current.name === 'list.userlists') {
        SendEmitCurrentEventUserList();
        return;
      }
      eventInfo = JSON.parse($window.localStorage.getItem("thisEvent"));
      listKey = eventInfo.code + '_currentEventUserList';
      users = JSON.parse($window.localStorage.getItem(listKey));
      user = $filter('getUserById')(users, data.from);
      subString = '.';
      if (user.status === '0') {
        subString = ' and say \'HI\' back.';
        user.status = "2";
      } else {
        user.status = "3";
      }
      msg = '<p> ' + data.fromName + 'has sent \'HI\'' + '<p> Click to see his profile' + subString;
      $scope.msgHeaderClass = 'hi_push';
      ShowHeader(msg);
      $scope.user = user;
      $scope.headerClickAction = ShowProfile;
      SendEmitCurrentEventUserList();
      $scope.$broadcast("update activity", data);
    };
    userListChange = function(data) {
      console.log('userListChange in menu');
      console.log(data);
      SendEmitCurrentEventUserList();
      $scope.$broadcast("update activity", data);
    };
    hiMe = function(data) {
      console.log('on hiMe in menu');
      SendEmitCurrentEventUserList();
      $scope.$broadcast("update activity", data);
    };
    pendingHi = function(data) {
      console.log('on pendinghi in menu');
      console.log(data.status);
      SendEmitCurrentEventUserList();
    };
    socket.on("notice", notice);
    socket.on("message", message);
    socket.on("groupMessage", groupMessage);
    socket.on("hi", hi);
    socket.on("userListChange", userListChange);
    socket.on("hiMe", hiMe);
    socket.on("pendingHi", pendingHi);
    $scope.chatRoom = function(user) {
      if ($scope.modalInstance != null) {
        $scope.modalInstance.close();
      }
      if (user.unread === true) {
        console.log('CancelRedPoint');
        user.unread = false;
        SaveUsersToLocalStorage();
      }
      history.pushState(null, null, '#/list/userlists');
      return $state.go('list.single', {
        userId: user._id
      });
    };
    $scope.DialogClose = function() {
      return $scope.modalInstance.close();
    };
    return $scope.$on("pushed", function(event, arg) {
      var args, user;
      console.log('pushed menu');
      console.dir(arg);
      args = {};
      if ($rootScope.deviceType === "android") {
        args.type = arg.payload.type;
        args.id = arg.payload.id;
      } else {
        args = arg;
      }
      switch (args.type) {
        case "personal":
          console.log("personal");
          user = GetUserById(args.id);
          if (user.status === '0' || user.status === '2') {
            $scope.user = user;
            return ShowProfile();
          } else {
            $scope.CloseHeaderMsg();
            history.pushState(null, null, '#/list/userlists');
            return $state.go('list.single', {
              userId: args.id
            });
          }
          break;
        case "group":
          console.log("group");
          history.pushState(null, null, '#/list/userlists');
          return $state.go('list.groupChat');
        case "notice":
          console.log("notice");
          history.pushState(null, null, '#/list/userlists');
          return $state.go('list.notice');
        case "hi":
          return console.log("hi");
      }
    });
  });

}).call(this);

(function() {
  angular.module('hiin').controller('MenuCtrlEtc', function($rootScope, $scope, Util, $window, socket, $state, $modal, $ionicNavBarDelegate) {
    $rootScope.selectedItem = 4;
    ionic.DomUtil.ready(function() {
      return $ionicNavBarDelegate.showBackButton(false);
    });
    $scope.TermAndPolish = function() {
      $scope.slide = 'slide-left';
      return $state.go('list.termAndPolish');
    };
    $scope.Report = function() {
      $scope.slide = 'slide-left';
      return $state.go('report');
    };
    $scope.signOut = function() {
      var modalInstance;
      Util.checkOrganizer().then(function(data) {
        console.log('---organizer state----');
        if (data.status === "0") {
          return $scope.message = "<p>are you sure to <p>log out?";
        } else if (data.status === "1") {
          return $scope.message = "<p>Your account infomation <p>(profile, chat history, activity log) will be permanently deleted when you log out.";
        }
      });
      modalInstance = $modal.open({
        templateUrl: "views/dialog/logout_notice.html",
        scope: $scope
      });
      modalInstance.result.then((function(selectedItem) {
        $scope.modalInstance = null;
      }), function() {
        return $scope.modalInstance = null;
      });
      return $scope.modalInstance = modalInstance;
    };
    $scope.okay = function() {
      console.log('ok');
      $scope.modalInstance.close();
      socket.emit("disconnect");
      return Util.authReq('get', 'logout', '').success(function(data) {
        if (data.status === "0") {
          console.log('logout');
          if ($window.localStorage != null) {
            $window.localStorage.clear();
          }
          socket.disconnect();
          $window.localStorage.setItem("socket_disconnect", '1');
          return $state.go('/');
        }
      }).error(function(error, status) {
        return console.log("error");
      });
    };
    $scope.cancel = function() {
      console.log('cancel');
      return $scope.modalInstance.close();
    };
    return $scope.Back = function() {
      return $window.history.back();
    };
  });

}).call(this);

(function() {
  'use strict';
  angular.module('hiin').controller('MenuEventCtrl', function($rootScope, $scope, Util, $http, socket, SocketClass, $log, $state, $ionicScrollDelegate, $ionicNavBarDelegate, $timeout, $ionicModal, $window) {
    var MakeEventListObj, MakeMyInfoOptionObj, SendEmitMyInfo, SetNewEvent, event, myinfo;
    $rootScope.selectedItem = 3;
    if ($rootScope.browser === 'android') {
      $scope.input_class = 'text_box_enter_code_android';
    } else {
      $scope.input_class = 'text_box_enter_code';
    }
    ionic.DomUtil.ready(function() {
      return $ionicNavBarDelegate.showBackButton(false);
    });
    $scope.thisEvent = new Array();
    event = $window.localStorage.getItem('thisEvent');
    if (event != null) {
      $scope.enteredEventsOrOwner = true;
      $scope.thisEvent.code = JSON.parse(event).code;
    } else {
      Util.checkOrganizer().then(function(data) {
        console.log('---organizer state----');
        if (data.status === "0") {
          return $scope.enteredEventsOrOwner = true;
        }
      }, function(status) {
        console.log('-----user or error-----');
        console.log(status);
        return console.log("error");
      });
      $scope.thisEvent.code = "";
    }
    myinfo = $window.localStorage.getItem("myInfo");
    MakeMyInfoOptionObj = function() {
      var socketMyInfo;
      socketMyInfo = new SocketClass.socketClass('myInfo', null, 1500, true);
      socketMyInfo.onCallback = function(data) {
        console.log("list myInfo");
        console.log(data);
        $window.localStorage.setItem('myInfo', JSON.stringify(data));
        $scope.myId = new Array();
        $scope.myId.author = JSON.parse($window.localStorage.getItem('myInfo'))._id;
      };
      return socketMyInfo;
    };
    MakeEventListObj = function() {
      var socketMyInfo;
      socketMyInfo = new SocketClass.socketClass('enteredEventList', null, 0, true);
      socketMyInfo.onCallback = function(data) {
        $scope.events = data;
      };
      return socketMyInfo;
    };
    SendEmitMyInfo = function() {
      return SocketClass.resSocket(MakeMyInfoOptionObj()).then(function(data) {
        console.log('socket got myInfo');
        return SocketClass.resSocket(MakeEventListObj());
      }).then(function(data) {
        return console.log('socket got event list');
      }, function(status) {
        return console.log("error");
      });
    };
    if (myinfo == null) {
      SendEmitMyInfo();
    } else {
      $scope.myId = new Array();
      $scope.myId.author = JSON.parse($window.localStorage.getItem('myInfo'))._id;
      SocketClass.resSocket(MakeEventListObj()).then(function(data) {
        return console.log('socket got event list');
      }, function(status) {
        return console.log("error");
      });
    }
    $scope.$on("$destroy", function(event) {
      if ($scope.modal != null) {
        $scope.modal.hide();
        $scope.modal.remove();
      }
    });
    SetNewEvent = function(data) {
      var deleteKeyList, i, key, _i, _j, _len, _ref;
      if ($scope.thisEvent.code !== "") {
        console.log($scope.thisEvent.code);
        deleteKeyList = [];
        for (i = _i = 0, _ref = $window.localStorage.length - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
          console.log(i);
          if ($window.localStorage.key(i).indexOf($scope.thisEvent.code) >= 0) {
            deleteKeyList.push($window.localStorage.key(i));
          }
        }
        for (_j = 0, _len = deleteKeyList.length; _j < _len; _j++) {
          key = deleteKeyList[_j];
          $window.localStorage.removeItem(key);
        }
      }
      $window.localStorage.setItem('thisEvent', JSON.stringify(data.event));
      if ($scope.myId.author === data.event.author) {
        $window.localStorage.setItem('thisEventOwner', 'true');
      } else {
        $window.localStorage.setItem('thisEventOwner', 'false');
      }
      return $state.go('list.userlists');
    };
    $scope.confirmCode = function() {
      var promise;
      promise = Util.ConfirmEvent($scope.formData);
      $scope.message = 'loaded';
      Util.ShowModal($scope, 'create_or_loaded_event');
      return $timeout((function() {
        return promise.then(function(data) {
          $scope.modal.hide();
          $scope.modal.remove();
          return SetNewEvent(data);
        }, function(status) {
          console.log('error');
          $scope.modal.hide();
          $scope.modal.remove();
          $scope.message = 'EVENT NOT FOUND';
          return Util.ShowModal($scope, 'no_event');
        });
      }), 1000);
    };
    $scope.CreateEvent = function() {
      return Util.checkOrganizer().then(function(data) {
        console.log('---organizer state----');
        if (data.status === "0") {
          $window.localStorage.setItem('flg_show_privacy_dialog', true);
          if ($rootScope.deviceType === 'ios') {
            return $state.go('list.createEvent');
          } else if ($rootScope.deviceType === 'android') {
            return $state.go('list.createEventAndroid');
          } else {
            return $state.go('list.createEventAndroid');
          }
        } else if (data.status === "1") {
          return Util.ShowModal($scope, 'create_event_attention');
        } else {
          return alert("error:status->" + data.status);
        }
      }, function(status) {
        console.log('-----user or error-----');
        console.log(status);
        return alert("error");
      });
    };
    $scope.yes = function() {
      var id_type;
      $scope.modal.hide();
      $scope.modal.remove();
      id_type = $window.localStorage.getItem("id_type");
      if (id_type === "facebook") {
        return Util.authReq('get', 'organizerFbSignUp', '').success(function(data) {
          console.log(data);
          if (data.status === '0') {
            return $scope.CreateEvent();
          }
        }).error(function(data, status) {
          return console.log(data);
        });
      } else {
        return $state.go('list.organizerSignUp');
      }
    };
    $scope.no = function() {
      $scope.modal.hide();
      return $scope.modal.remove();
    };
    $scope.current = function(event) {
      return event.code === $scope.thisEvent.code;
    };
    $scope.myEvent = function(event) {
      return event.code !== $scope.thisEvent.code && event.author === $scope.myId.author;
    };
    $scope.pastEvent = function(event) {
      return event.code !== $scope.thisEvent.code && event.author !== $scope.myId.author;
    };
    $scope.GotoEvent = function(code) {
      var confirmData;
      confirmData = {
        code: code
      };
      return Util.ConfirmEvent(confirmData).then(function(data) {
        return SetNewEvent(data);
      }, function(status) {
        console.log('error');
        return Util.ShowModal($scope, 'no_event');
      });
    };
    return $scope.back = function() {
      $scope.modal.hide();
      return $scope.modal.remove();
    };
  });

}).call(this);

(function() {
  'use strict';
  angular.module('hiin').controller('ProfileCtrl', function($rootScope, $ionicLoading, $scope, Util, Host, $ionicNavBarDelegate, $window, SocketClass) {
    var MakeMyInfoOptionObj;
    $rootScope.selectedItem = 1;
    $scope.$on("$destroy", function(event) {});
    ionic.DomUtil.ready(function() {
      return $ionicNavBarDelegate.showBackButton(false);
    });
    $scope.imageUploadUrl = "" + (Host.getAPIHost()) + ":" + (Host.getAPIPort()) + "/profileImage";
    $scope.isEditMode = false;
    $scope.btn_edit_or_confirm = 'edit';
    MakeMyInfoOptionObj = function() {
      var socketMyInfo;
      socketMyInfo = new SocketClass.socketClass('myInfo', null, 0, true);
      socketMyInfo.onCallback = function(data) {
        console.log("list myInfo");
        console.log(data);
        $scope.userInfo = data;
        $window.localStorage.setItem('myInfo', JSON.stringify(data));
      };
      return socketMyInfo;
    };
    $scope.userInfo = JSON.parse($window.localStorage.getItem('myInfo'));
    if ($scope.userInfo == null) {
      SocketClass.resSocket(MakeMyInfoOptionObj()).then(function(data) {
        $scope.userInfo = JSON.parse($window.localStorage.getItem('myInfo'));
        return console.log('socket got myInfo');
      }, function(status) {
        return console.log("error");
      });
    }
    $scope.edit = function() {
      return $scope.isEditMode = !$scope.isEditMode;
    };
    $scope.cancel = function() {
      return $scope.isEditMode = false;
    };
    $scope.done = function() {
      $scope.isEditMode = false;
      return Util.makeReq('post', 'editUser', $scope.userInfo).success(function(data) {
        SocketClass.resSocket(MakeMyInfoOptionObj()).then(function(data) {
          return console.log('socket got myInfo');
        }, function(status) {
          return console.log("error");
        });
        return console.log(data);
      }).error(function(data, status) {
        return console.log(data);
      });
    };
    $scope.onSuccess = function(response) {
      console.log("onSucess");
      $scope.userInfo.photoUrl = response.data.photoUrl;
      $scope.userInfo.thumbnailUrl = response.data.thumbnailUrl;
    };
    $scope.onUpload = function(files) {
      return $ionicLoading.show({
        template: "Uploading..."
      });
    };
    $scope.onError = function(response) {
      alert('Image Upload error');
      return console.log('error');
    };
    return $scope.onComplete = function(response) {
      console.log('complete');
      return $ionicLoading.hide();
    };
  });

}).call(this);

(function() {
  angular.module('hiin').controller('NoticeCtrl', function($rootScope, $filter, $scope, SocketClass, Util, $window, socket, $state, $modal, $ionicNavBarDelegate, $stateParams, $ionicScrollDelegate) {
    var MakeNoticeListOptionObj, SendEmitCurrentEventUserList, eventInfo, listKey, notice, tempList, thisEvent;
    console.log('grpChat');
    $scope.data = {};
    $scope.owner = {};
    $rootScope.noticeFlg = false;
    if ($window.localStorage != null) {
      eventInfo = JSON.parse($window.localStorage.getItem("thisEvent"));
      thisEvent = eventInfo.code;
      $scope.myInfo = JSON.parse($window.localStorage.getItem('myInfo'));
      console.log($scope.myInfo);
      if (eventInfo.author === $scope.myInfo._id) {
        $scope.amIOwner = true;
        $scope.owner = $scope.myInfo;
      } else {
        $scope.amIOwner = false;
        listKey = thisEvent + '_currentEventUserList';
        tempList = $window.localStorage.getItem(listKey);
        $scope.owner = $filter('getUserById')(JSON.parse(tempList), eventInfo.author);
      }
    }
    $scope.ShowProfile = function(sender) {
      var modalInstance, user;
      user = $scope.owner;
      if (user === null) {
        return;
      }
      console.log(user);
      $scope.user = user;
      modalInstance = $modal.open({
        templateUrl: "views/dialog/user_card.html",
        scope: $scope
      });
      modalInstance.result.then((function(selectedItem) {
        $scope.modalInstance = null;
      }), function() {
        $scope.modalInstance = null;
      });
      return $scope.modalInstance = modalInstance;
    };
    $scope.DialogClose = function() {
      return $scope.modalInstance.close();
    };
    MakeNoticeListOptionObj = function() {
      var socketNotice;
      socketNotice = new SocketClass.socketClass('allNotice', null, 0, true);
      socketNotice.onCallback = function(data) {
        $scope.messages = data;
        $ionicScrollDelegate.scrollBottom(true);
        return console.log(data);
      };
      return socketNotice;
    };
    SendEmitCurrentEventUserList = function() {
      SocketClass.resSocket(MakeNoticeListOptionObj()).then(function(data) {
        return console.log(' got notice list');
      }, function(status) {
        return console.log("error");
      });
    };
    $scope.ScrollToBottom = function() {
      return $ionicScrollDelegate.scrollBottom();
    };
    SendEmitCurrentEventUserList();
    notice = function(data) {
      console.log(data);
      data.created_at = data.regTime;
      $scope.messages.push(data);
      if ($scope.bottom === false) {
        $scope.newMsg = data;
        return $scope.newMsg.msg = Util.trimStr(data.content, 30);
      } else {
        return $ionicScrollDelegate.scrollBottom();
      }
    };
    socket.on("notice", notice);
    $scope.sendMessage = function() {
      var time;
      time = new Date();
      if ($scope.data.message === "") {
        return;
      }
      socket.emit("notice", {
        created_at: time,
        message: $scope.data.message
      });
      return $scope.data.message = "";
    };
    window.addEventListener("native.keyboardshow", function(e) {
      console.log("Keyboard height is: " + e.keyboardHeight);
      if (document.activeElement.tagName === "BODY") {
        cordova.plugins.Keyboard.close();
        return;
      }
      window.scroll(0, 0);
      $scope.data.keyboardHeight = e.keyboardHeight;
      $timeout((function() {
        $ionicScrollDelegate.scrollBottom(true);
      }), 200);
    });
    window.addEventListener("native.keyboardhide", function(e) {
      console.log("Keyboard close");
      $scope.data.keyboardHeight = 0;
      $ionicScrollDelegate.resize();
    });
    ionic.DomUtil.ready(function() {
      console.log('ready');
      if (window.cordova) {
        cordova.plugins && cordova.plugins.Keyboard && cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      }
      $scope.bottom = true;
      $scope.scrollDelegate = $ionicScrollDelegate.$getByHandle('myScroll');
      return $scope.scrollDelegate.getScrollView().onScroll = function() {
        if (($scope.scrollDelegate.getScrollView().__maxScrollTop - $scope.scrollDelegate.getScrollPosition().top) < 30) {
          $scope.bottom = true;
          if ($scope.newMsg !== null) {
            $scope.newMsg = null;
            return $ionicScrollDelegate.scrollBottom();
          }
        } else {
          return $scope.bottom = false;
        }
      };
    });
    return $scope.$on("$destroy", function(event) {
      if (window.cordova) {
        return cordova.plugins && cordova.plugins.Keyboard && cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false) && cordova.plugins.Keyboard.close();
      }
    });
  });

}).call(this);

(function() {
  'use strict';
  angular.module('hiin').controller('OrganizerLoginCtrl', function(Util, $scope, $state, $window) {
    $scope.Login = function() {
      return Util.emailLogin($scope.userInfo).then(function(data) {
        return $state.go('list.events');
      }, function(status) {
        console.log(status);
        console.log('error');
        $scope.msgHeaderShow = true;
        $scope.headerMsg = '<p> You have entered a wrong <p> combo email and password.';
        return $scope.msgHeaderClass = 'error_panel';
      });
    };
    $scope.back = function() {
      return $window.history.back();
    };
    $scope.GotoResetPassword = function() {
      return $state.go('resetPassword');
    };
    $scope.CloseHeaderMsg = function() {
      return $scope.msgHeaderShow = false;
    };
  });

  return;

}).call(this);

(function() {
  'use strict';
  angular.module('hiin').controller('OrganizerSignCtrl', function(Util, $scope, $state, $window, $q) {
    $scope.userInfo = {};
    $scope.userInfo.email = '';
    $scope.userInfo.password = '';
    $scope.headerMsg = '<p> You have entered a wrong <p> combo email and password.';
    $scope.msgHeaderClass = 'error_panel';
    $scope.back = function() {
      return $window.history.back();
    };
    $scope.CloseHeaderMsg = function() {
      return $scope.msgHeaderShow = false;
    };
    $scope.MakeId = function(userInfo) {
      var deferred;
      deferred = $q.defer();
      Util.authReq('post', 'organizerSignUp', userInfo).success(function(data) {
        if (data.status < 0) {
          deferred.reject(data);
        }
        return deferred.resolve(data);
      }).error(function(data, status) {
        console.log(data);
        return deferred.reject(status);
      });
      return deferred.promise;
    };
    $scope.CreateAndSignIn = function() {
      if ($scope.userInfo.email === '' || ($scope.userInfo.password !== $scope.repeat_password)) {
        $scope.msgHeaderShow = true;
        return;
      }
      $scope.MakeId($scope.userInfo).then(function(data) {
        return $state.go('list.createEvent');
      }, function(status) {
        return alert('err');
      });
    };
    $scope.organizerLogin = function() {
      return $state.go('list.organizerLogin');
    };
  });

  return;

}).call(this);

(function() {
  'use strict';
  angular.module('hiin').controller('SignInCtrl', function($modal, $sce, $q, $http, $scope, $window, Util, Host, $state, $timeout, $ionicLoading) {
    $scope.userInfo = {};
    $scope.userInfo.gender = 1;
    $scope.userInfo.photoUrl = '';
    $scope.userInfo.thumbnailUrl = '';
    $scope.photoUrl = 'images/no_image.jpg';
    $scope.imageUploadUrl = "" + (Host.getAPIHost()) + ":" + (Host.getAPIPort()) + "/profileImage";
    $scope.ToggleGender = function(gender) {
      return $scope.userInfo.gender = gender;
    };
    $scope.back = function() {
      return $window.history.back();
    };
    $scope.onSuccess = function(response) {
      var userInfo;
      console.log("onSucess");
      console.log(response);
      if ($scope.userInfo != null) {
        userInfo = $scope.userInfo;
      } else {
        userInfo = {};
        userInfo.gender = 1;
      }
      userInfo.photoUrl = response.data.photoUrl;
      userInfo.thumbnailUrl = response.data.thumbnailUrl;
      $scope.photoUrl = Util.serverUrl() + "/" + response.data.photoUrl;
      $scope.thumbnailUrl = Util.serverUrl() + "/" + response.data.thumbnailUrl;
      $scope.userInfo = userInfo;
      angular.element('img.image_upload_btn').attr("src", $scope.thumbnailUrl);
    };
    $scope.onUpload = function(files) {
      return $ionicLoading.show({
        template: "Uploading..."
      });
    };
    $scope.onError = function(response) {
      alert('Image Upload error');
      return console.log('error');
    };
    $scope.onComplete = function(response) {
      return $ionicLoading.hide();
    };
    $scope.SignUp = function(isValid) {
      console.log(isValid);
      if ($scope.userInfo.photoUrl === "") {
        if ($scope.userInfo.gender === 1) {
          $scope.userInfo.photoUrl = "profileImageOriginal/female.png";
          $scope.userInfo.thumbnailUrl = "profileImageThumbnail/female.png";
        } else {
          $scope.userInfo.photoUrl = "profileImageOriginal/male.png";
          $scope.userInfo.thumbnailUrl = "profileImageThumbnail/male.png";
        }
      }
      if (isValid === true) {
        Util.MakeId($scope.userInfo).then(function(data) {
          console.log(data);
          console.log('---return make Id---');
          $window.localStorage.setItem("auth_token", data.Token);
          $window.localStorage.setItem("id_type", 'normal');
          return $scope.signIn();
        }, function(status) {
          return alert('err');
        });
      } else {
        return $scope.showAlert();
      }
    };
    $scope.signIn = function() {
      Util.userStatus().then(function(data) {
        console.log(console.log('---return userStatus---'));
        console.log(data);
        return $state.go('list.events');
      }, function(status) {
        return alert(status);
      });
    };
    $scope.open = function($event) {
      $event.preventDefault();
      $event.stopPropagation();
      $scope.opened = true;
    };
    return $scope.showAlert = function() {
      var modalInstance;
      return modalInstance = $modal.open({
        templateUrl: "views/login/alert.html",
        scope: $scope
      });
    };
  });

}).call(this);

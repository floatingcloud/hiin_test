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

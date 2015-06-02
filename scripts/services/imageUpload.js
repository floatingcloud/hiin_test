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

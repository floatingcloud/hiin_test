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

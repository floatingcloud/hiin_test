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

/**
 * Common angular's cross-project utils
 * It's now working and guarantees to work with angular 1.2.16
 */
(function ()
{
	"use strict";

var module = angular.module('Utils', [])

	/**
	 * Some helpers for working with structures of data
	 */
	.factory('UtilsHelpers', [function UtilsHelpers() {
		return {
			/**
			 * Gets object value (nested) or default value
			 * @param {Object} obj
			 * @param {String} key dot separated string of nested keys
			 * @param {*} defaultVal default value
			 * @return {*|Object}
			 */
			getVal: function getVal(obj, key, defaultVal)
			{
				var keys = angular.isString(key) ? key.split('.') : [];

				if (! keys.length) {
					return defaultVal;
				}


				for (var i = 0, l = keys.length, curKey; i < l; i ++)
				{
					if (! angular.isObject(obj)) {
						return defaultVal;
					}
					curKey = keys[i];
					if (! (curKey in obj)) {
						return defaultVal;
					}

					obj = obj[curKey];
				}
				return obj;
			},
			/**
			 * Filters array
			 * @link https://github.com/lodash/lodash/blob/master/lodash.js (arrayFilter)
			 */
			filter: function filter(array, func)
			{
				var index = - 1,
					length = array.length,
					result = [];

				while (++ index < length) {
					var value = array[index];
					if (func(value, index, array)) {
						result.push(value);
					}
				}
				return result;
			},
			/**
			 * Maps for array
			 * @link https://github.com/lodash/lodash/blob/master/lodash.js (arrayMap)
			 */
			map: function map(array, iterator)
			{
				var index = - 1,
					length = array ? array.length : 0,
					result = Array(length);

				while (++ index < length) {
					result[index] = iterator(array[index], index, array);
				}
				return result;
			}
		};
	}])

	/**
	 * It's for compiling template into html using scope
	 */
	.factory('UtilsCompiler', [
			'$rootScope',
			'$compile',
			'$interpolate',
			'$http',
			'$sce',
			'$templateCache',
			'$q',
			function UtilsCompiler($rootScope, $compile, $interpolate, $http, $sce, $templateCache, $q) {
		return {
			/**
			 * Compiles given string with html in it into either list of elements or div with compiled elements as children
			 * @param {String} html
			 * @param {Object} scope $scope
			 * @param {Boolean} asHtml if html needed
			 * @returns {Array|HTMLElement}
			 */
			compile: function compile(html, scope, asHtml) {
				var compiledElments = $compile(angular.element(html))(scope);
				if (! asHtml) {
					return compiledElments;
				}
				var parentEl = document.createElement('div');
				angular.forEach(compiledElments, function (el) {
					parentEl.appendChild(el);
				});
				return parentEl;
			},
			/**
			 * Interpolates template to html using params
			 * @param {String} html template
			 * @param {Object} params
			 * @returns {String}
			 */
			interpolate: function interpolate(html, params)
			{
				return $interpolate(html || '')(params || {});
			},
			/**
			 * Gets template and interpolates it to html using params
			 * @param {String} url template url
			 * @param {Object} params
			 * @param {Boolean} throwOnError throw error on load error
			 * @returns {promise}
			 */
			interpolateByUrl: function interpolate(url, params, throwOnError)
			{
				var deferred = $q.defer(),
					me = this;

				$http.get($sce.getTrustedResourceUrl(url), {cache: $templateCache})
					.success(function (content) {
						var str = me.interpolate(content, params);
						deferred.resolve(str);
					})
					.error(function (response) {
						var msg = 'Failed to load template: ' + url;
						deferred.reject(msg);
						if (throwOnError) {
							throw Error(msg);
						}
					});

				return deferred.promise;
			},
			/**
			 * Gets template and compiles it to html using params
			 * @param {String} url template url
			 * @param {Object} scope $scope
			 * @param {Boolean} asHtml if html needed
			 * @param {Boolean} throwOnError throw error on load error
			 * @returns {promise}
			 */
			compileByUrl: function compileByUrl(url, scope, asHtml, throwOnError)
			{
				var deferred = $q.defer(),
					me = this;

				$http.get($sce.getTrustedResourceUrl(url), {cache: $templateCache})
					.success(function (content) {
						var parentEl = me.compile(content, scope, asHtml);
						deferred.resolve(parentEl);
					})
					.error(function (response) {
						var msg = 'Failed to load template: ' + url;
						deferred.reject(msg);
						if (throwOnError) {
							throw Error(msg);
						}
					});

				return deferred.promise;
			},
			/**
			 * Gets template and interpolates it to html using params
			 * @param {String} url template url
			 * @param {Boolean} throwOnError throw error on load error
			 * @returns {Promise}
			 */
			getTemplateByUrl: function getTemplateByUrl(url, throwOnError)
			{
				return $http.get($sce.getTrustedResourceUrl(url), {cache: $templateCache});
			}
		};
	}])

	/**
	 * It's for fixing events for native events
	 */
	.factory('UtilsEvent', [function UtilsEvent()
	{
		return {
			fixWhich: function fixWhich(event)
			{
				// fixing event.which to make it crossbrowser @link https://github.com/jquery/jquery/blob/master/src/event.js
				if ( event.which == null ) {
					event.which = event.charCode != null ? event.charCode : event.keyCode;
				}
				return event;
			}
		};
	}])

	/**
	 * It's for extending angular's $http with extra functionality like aborting, logging and etc.
	 */
	.factory('UtilsHttp', ['$http', '$q', function UtilsHttp($http, $q)
	{
		/**
		 * Here we mixin extra functionality.
		 * Now it's for method "abort" only.
		 *
		 * @param {String} methodName - name of method to extend
		 * @param {Arguments} args
		 * @returns {promise} - it also has method "abort"
		 */
		function extendHttp(methodName, args)
		{
			if (! methodName in $http)
			{
				var d = $q.defer();
				d.reject();
				return d.promise;
			}

			var aborter = $q.defer();
			if (! args[1]) {
				args[1] = {};
			}
			args[1] = angular.extend({timeout: aborter.promise}, args[1]);

			var resultPromise = $http[methodName].apply($http, args);
			resultPromise.abort = function abort()
			{
				aborter.resolve();
			};

			/**
			 * we're cleaning up on finish
			 * (Ben Nadel's idea - @link http://www.bennadel.com/blog/2616-aborting-ajax-requests-using-http-and-angularjs.htm)
			 */
			resultPromise.finally(function () {
				resultPromise.abort = angular.noop;
				resultPromise = aborter = null;
			});

			return resultPromise;
		}

		return {
			'get': function ()
			{
				return extendHttp('get', arguments);
			},
			'delete': function ()
			{
				return extendHttp('delete', arguments);
			},
			head: function ()
			{
				return extendHttp('head', arguments);
			},
			jsonp: function ()
			{
				return extendHttp('jsonp', arguments);
			},
			post: function ()
			{
				return extendHttp('post', arguments);
			},
			put: function ()
			{
				return extendHttp('put', arguments);
			},
			pendingRequests: $http.pendingRequests
		};
	}])

	/**
	 * This service is to work with localStorage
	 */
	.factory('UtilsLocalStorageService', ['$cacheFactory', function UtilsLocalStorageService($cacheFactory) {
		var prefix = '__sm_angular_data__',
			cache = $cacheFactory('__has_localstorage__');

		function _t()
		{
			var t = '__pewpewpew__';
			localStorage.setItem(t, t);
			localStorage.removeItem(t);
		}

		function _check()
		{
			var res = cache.get('has');
			if (angular.isDefined(res)) {
				return res;
			}

			try
			{
				_t();
				res = true;
			}
			catch (e) {
				res = false;
			}
			cache.put('has', res);
			return res;
		}

		return {
			check: function check()
			{
				return _check();
			},
			getByKey: function getByKey(key)
			{
				var JSON_START = /^\s*(\[|\{[^\{])/,
					JSON_END = /[\}\]]\s*$/;
				var val = localStorage.getItem(prefix + key);
				// check and return object/array
				if (JSON_START.test(val) && JSON_END.test(val)) {
					return angular.fromJson(val);
				}
				return val;
			},
			put: function put(key, value)
			{
				if (angular.isObject(value) || angular.isArray(value)) {
					value = angular.toJson(value);
				}
				localStorage.setItem(prefix + key, value);
				return true;
			},
			remove: function remove(key)
			{
				localStorage.removeItem(prefix + key);
			}
		};
	}]);

	/**
	 * Throttling callbacks with specified delay.
	 * inspired by @link http://benalman.com/projects/jquery-throttle-debounce-plugin/
	 *
	 * UtilsThrottle is invoking callback for the first time and after that every delay.
	 * UtilsDebounce IS NOT invoking callback for the first time.
	 * UtilsWaitLast IS waiting for the last invokation occured and only then callback is started.
	 */
	angular.forEach(['UtilsThrottle', 'UtilsDebounce', 'UtilsWaitLast'], function (factoryName) {

	module
		.factory(factoryName, ['$rootScope', function ($rootScope)
		{
			var allTimeouts = {};
			$rootScope.$on('$routeChangeStart', function() {
				for (var i in allTimeouts) {
					clearTimeout(allTimeouts[i]);
				}
				allTimeouts = {};
			});

			/**
			 *
			 * @param {Number} delay in ms
			 * @param {Boolean} noTrailing it is to prevent execution one last time after all invokation stopped
			 * @param {Object} $scope
			 * @param {Function} callback
			 * @returns {Function} this function will be invoked each time
			 */
			return function (delay, noTrailing, $scope, callback) {
				var unique = Math.round(Math.random() * 1e15),
					timeoutId,
					lastExec = (factoryName === 'UtilsDebounce' || factoryName === 'UtilsWaitLast') ? (+new Date) : 0;

				if (typeof noTrailing != 'boolean')
				{
					callback = $scope;
					$scope = noTrailing;
					noTrailing = undefined;
				}

				// this wrapper will be invoked by consumers
				function wrapper()
				{

					var me = this,
						elapsed = factoryName === 'UtilsWaitLast' ? 0 : ((+new Date) - lastExec),
						args = arguments;

					timeoutId && clearTimer();

					if (elapsed > delay) {
						exec();
					}
					else if (! noTrailing)
					{
						timeoutId = setTimeout(function () {exec()}, delay - elapsed);
						storeTimer();
					}

					// Executing given function
					function exec()
					{
						lastExec = +new Date;
						clearTimer();
						callback.apply(me, args);
						if (! $scope.$$phase) {
							$scope.$digest();
						}
					}

					function storeTimer()
					{
						allTimeouts[unique] = timeoutId;
					}
					function clearTimer()
					{
						clearTimeout(timeoutId);
						allTimeouts[unique] = timeoutId;
					}
				}

				return wrapper;
			};
		}]);
	});

}());
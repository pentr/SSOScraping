//Modules required
var fs = require('fs');
var Nightmare = require('nightmare');

//Variable declaration
var visited = [];
var num = 0;
var links = [];

//Get command line arg and run
var sites = JSON.parse(process.argv.slice(2));
run(sites);

function run(array){
	array.reduce(function(accumulator, url) {
  		return accumulator.then(function(results) {
  			var link = "https://www." + url;
  			var ssoInfo = {"parent" : "none", "url" : link, "sso" : []};
  			var start = Date.now();
			var nightmare = Nightmare({
				gotoTimeout : 30000,
				show : false
			});
			return nightmare.goto(link)
				.evaluate(function(){
					window.fns = {
						prefilter : function(node){
				    		var bool = true;
			                if (node.nodeName != "A" && node.nodeName != "DIV" && node.nodeName != "IMG" &&
			                    node.nodeName != "SPAN" && node.nodeName != "INPUT" &&
			                    node.nodeName != "BUTTON") bool = false;
			                if (node.nodeName == "INPUT") {
			                    if (node.type != "button" && node.type != "img" &&
			                        node.type != "submit") bool = false;
			                }
			                if (node.nodeName == "A") {
			                    if (node.href.toLowerCase().indexOf('mailto:') == 0) bool = false;
			                }
			                return bool;
				    	},
						processDOM : function(){
							var tree = []; var candidates = []; var sites = []; var result = {"candidates" : [], "links" : []};
				    		tree.push(document.body);
				    		while(tree.length > 0){
				    			var branch = tree.pop();
				    			if(branch != null){
				    				var children = branch.children;
				    				if(children){
				    					var arr = [].slice.call(children);
					    				tree = tree.concat(arr);
				    				}
				    				if(!(branch.attributes == null || branch.nodeName == 'SCRIPT' || branch.nodeName == 'EMBED')){
										if(this.prefilter(branch)){
											var sso = this.hasSSO(branch);
				    						if(sso){
				    							if(candidates.indexOf(sso) == -1) candidates.push(sso);
				    						}else{
				    							var link = this.hasLinks(branch);
				    							if(link && sites.indexOf(link) == -1) sites.unshift(link);
				    						}
										}
									}
								}
							}
							result.candidates = candidates;
				    		result.links = this.limitLinks(sites);
				    		if(result.links.length == 0) result.links = this.makeNewLinks();
				    		return result;
						},
						hasLinks : function(node){
				    		var attrStr = this.makeAttrString(node);
				    		if(this.checkLinkWords(attrStr)){
				    			return this.extractLink(node);
				    		}
				    	},
				    	checkLinkWords : function(inputstr){
			                var l1 = /log[\-\s]*[io]+n/gi;
			                var l2 = /sign[\-\s]*[io]+n/gi;
			                var l3 = /sign[\-\s]*up+/gi;
			                var l4 = /create[\-\s]*account+/gi;
			                var l5 = /register/gi;
			                var e0 = /social/gi; var e1 = /subscribe/gi; var e2 = /connect/gi; var e3 = /like/gi; var e4 = /support/gi;
			                var e5 = /recovery/gi; var e6 = /forgot/gi; var e7 = /help/gi; var e8 = /promo[tion]*/gi; 
			                var e9 = /privacy[\-\s]*[policy]*/gi; var e10 = /sports/gi; var e11 = /story/gi; var e12 = /campaign/gi;
			                var e13 = /questions/gi; var e14 = /store/gi; var e15 = /itunes/gi; var e16 = /play\.google/gi;
			                var e17 = /graph\.facebook/gi;

			                if(inputstr.match(e0) == null && inputstr.match(e1) == null  && inputstr.match(e2) == null && 
			                    inputstr.match(e3) == null && inputstr.match(e4) == null && inputstr.match(e5) == null &&
			                    inputstr.match(e6) == null && inputstr.match(e7) == null && inputstr.match(e8) == null &&
			                    inputstr.match(e9) == null && inputstr.match(e10) == null && inputstr.match(e11) == null &&
			                    inputstr.match(e12) == null && inputstr.match(e13) == null && inputstr.match(e14) == null
			                    && inputstr.match(e15) == null && inputstr.match(e16) == null && inputstr.match(e17) == null){
			                    if(inputstr.match(l1) != null || inputstr.match(l2) != null || 
			                    	inputstr.match(l3) != null || inputstr.match(l4) != null || inputstr.match(l5) != null){
			                        return true;
			                   	}
			                }
			                return false;
			            },
			            extractLink :  function(node){
			            	var parent = node.parentElement;
			                var val = node.getAttribute('href') || node.getAttribute('onclick') || node.getAttribute('action');
			                if(val){
			                    return val;
			                }else{
			                    if(parent){
			                        var parentVal = node.getAttribute('href') || node.getAttribute('onclick') || node.getAttribute('action');
			                        if(parentVal) return parentVal;
			                    }
			                }
			                return null;
			            },
				    	makeAttrString : function(node){
				    		var str = '';
			                var attribs = node.attributes;
			                for(var i=0; i < attribs.length; i++){
			                    str += attribs[i].name + "=" + attribs[i].value + ";"
			                }
			                return str;
				    	},
				    	hasSSO : function(node){
				    		var attrStr = this.makeAttrString(node);
				    		var result = this.checkSSOWords(attrStr);
				    		if(result) return result;
				    	},
				    	checkSSOWords : function(inputstr){
				    		var sso = [{"site" : "google", "regex" : /google/gi, "url" : ["https://accounts.google.com/o/oauth2/auth"]}, 
								{"site" : "yahoo", "regex" : /yahoo/gi, "url" : ["https://api.login.yahoo.com/oauth2/request_auth"]}, 
								{"site" : "500px", "regex" : /500px/gi, "url": ["https://api.500px.com/v1/oauth"]}, 
								{"site" : "aol", "regex" : /aol/gi, "url" :["https://api.screenname.aol.com/auth"]}, 
								{"site" : "twitter", "regex" : /twitter/gi, "url" : ["https://api.twitter.com/oauth"]}, 
								{"site" : "vk", "regex" : /vk/gi, "url" : ["https://oauth.vk.com/authorize"]}, 
								{"site" : "yammer", "regex" : /yammer/gi, "url" : ["https://www.yammer.com/oauth2/authorize"]}, 
								{"site" : "yandex", "regex" : /yandex/gi, "url" : ["https://oauth.yandex.com/authorize"]},
								{"site" : "zendesk", "regex" : /zendesk/gi, "url" : [".zendesk.com/oauth/authorizations/new"]}, 
								{"site" : "amazon", "regex" : /amazon/gi, "url" : ["http://g-ecx.images-amazon.com/images/G/01/lwa/btnLWA", "https://images-na.ssl-images-amazon.com/images/G/01/lwa/btnLWA"]},
								{"site" : "flickr", "regex" : /flickr/gi, "url" : ["https://www.flickr.com/services/oauth"]}, 
								{"site" : "bitbucket", "regex" : /bitbucket/gi, "url" : ["https://bitbucket.org/site/oauth2", "https://bitbucket.org/api/1.0/oauth"]}, 
								{"site" : "bitly", "regex" : /bitly/gi, "url" : ["https://bitly.com/oauth"]}, 
								{"site" : "cloud foundry", "regex" : /cloud[\-\s]*foundry/gi, "url" : ["/uaa/oauth"]}, 
								{"site" : "dailymotion", "regex" : /dailymotion/gi, "url" : ["https://www.dailymotion.com/oauth"]}, 
								{"site" : "deviantart", "regex" : /deviantART/gi, "url" : ["https://www.deviantart.com/oauth2"]}, 
								{"site" : "discogs", "regex" : /discogs/gi, "url" : ["https://api.discogs.com/oauth"]}, 
								{"site" : "huddle", "regex" : /huddle/gi, "url" : ["https://login.huddle.net/request"]}, 
								{"site" : "netflix", "regex" : /netflix/gi, "url" : ["https://api-user.netflix.com/oauth"]}, 
								{"site" : "openlink data spaces", "regex" : /openlink[\-\s]*data[\-\s]*spaces/gi, "url" : ["/OAuth"]}, 
								{"site" : "openstreetmap", "regex" : /openstreetmap/gi, "url" : ["http://www.openstreetmap.org/oauth"]}, 
								{"site" : "opentable", "regex" : /opentable/gi, "url" : ["http://www.opentable.com/oauth"]}, 
								{"site" : "passport", "regex" : /passport/gi, "url" : ["/dialog/authorize", "oauth2/authorize", "oauth/authorize"]},
								{"site" : "paypal", "regex" : /paypal/gi, "url" : ["paypal.com/v1/oauth2"]}, 
								{"site" : "plurk", "regex" : /plurk/gi, "url" : ["https://www.plurk.com/OAuth/authorize"]},
								{"site" : "sina weibo", "regex" : /sina[\-\s]*weibo/gi, "url" : ["http://api.t.sina.com.cn/oauth/authorize"]},
								{"site" : "stackexchange", "regex" : /stack[\-\s]*exchange/gi, "url" : ["https://stackexchange.com/oauth"]}, 
								{"site" : "statusnet", "regex" : /statusnet/gi, "url" : ["status.net/api/oauth/authorize"]}, 
								{"site" : "ubuntu one", "regex" : /ubuntu[\-\s]*one/gi, "url" : ["https://login.ubuntu.com/api/1.0/authentications"]},
								{"site" : "viadeo", "regex" : /viadeo/gi, "url" : ["https://partners.viadeo.com/oauth/authorize"]},
								{"site" : "vimeo", "regex" : /vimeo/gi, "url" : ["https://api.vimeo.com/oauth/authorize"]}, 
								{"site" : "withings", "regex" : /withings/gi, "url" : ["https://oauth.withings.com/account/authorize"]},
								{"site" : "xero", "regex" : /xero/gi, "url" : ["https://api.xero.com/oauth/Authorize"]},
								{"site" : "xing", "regex" : /xing/gi, "url" : ["https://api.xing.com/v1/authorize"]}, 
								{"site" : "goodreads", "regex" : /goodreads/gi, "url" : ["http://www.goodreads.com/oauth"]}, 
								{"site" : "google app engine", "regex" : /google[\-\s]*app[\-\s]*engine/gi, "url" : ["https://accounts.google.com/o/oauth2/v2/auth"]},
								{"site" : "groundspeak", "regex" : /groundspeak/gi, "url" : ["groundspeak.com/oauth"]}, 
								{"site" : "intel cloud services", "regex" : /intel[\-\s]*cloud[\-\s]*services/gi, "url" : []}, 
								{"site" : "jive", "regex" : /jive/gi, "url" : ["jiveon.com/oauth2"]}, 
								{"site" : "linkedin", "regex" : /linkedin/gi, "url" : ["https://www.linkedin.com/oauth/v2/authorization"]}, 
								{"site" : "trello", "regex" : /trello/gi, "url" : ["https://trello.com/1/OAuthAuthorizeToken", "https://trello.com/1/authorize"]}, 
								{"site" : "tumblr", "regex" : /tumblr/gi, "url" : ["https://www.tumblr.com/oauth/authorize"]}, 
								{"site" : "microsoft", "regex" : /microsoft/gi, "url" : ["https://login.live.com/oauth20"]},
								{"site" : "mixi", "regex" : /mixi/gi, "url" : ["api.mixi-platform.com/OAuth"]}, 
								{"site" : "myspace", "regex" : /myspace/gi, "url" : ["api.myspace.com/authorize"]}, 
								{"site" : "etsy", "regex" : /etsy/gi, "url" : ["https://www.etsy.com/oauth"]}, 
								{"site" : "evernote", "regex" : /evernote/gi, "url" : ["https://sandbox.evernote.com/OAuth.action"]},  
								{"site" : "yelp", "regex" : /yelp/gi, "url" : ["https://api.yelp.com/oauth2"]},  
								{"site" : "facebook", "regex" : /facebook/gi, "url" : ["fb-login-button", "https://www.facebook.com/v2.0/dialog/oauth",  "https://www.facebook.com/v2.3/dialog/oauth", "https://graph.facebook.com/v2.8/oauth/authorize"]},
								{"site" : "dropbox", "regex" : /dropbox/gi, "url" : ["https://www.dropbox.com/1/oauth2/authorize", "https://www.dropbox.com/1/oauth/authorize"]}, 
								{"site" : "twitch", "regex" : /twitch/gi, "url" : ["https://api.twitch.tv/kraken/oauth2/authorize"]},
								{"site" : "stripe", "regex" : /stripe/gi, "url" : ["https://connect.stripe.com/oauth/authorize"]},
								{"site" : "basecamp", "regex" : /basecamp/gi, "url" : ["https://launchpad.37signals.com/authorization/new"]},
								{"site" : "box", "regex" : /box/gi, "url" : ["https://account.box.com/api/oauth2/authorize"]},
								{"site" : "formstack", "regex" : /formstack/gi, "url" : ["https://www.formstack.com/api/v2/oauth2/authorize"]},
								{"site" : "github", "regex" : /github/gi, "url" : ["https://github.com/login/oauth/authorize"]},
								{"site" : "reddit", "regex" : /reddit/gi, "url" : ["https://www.reddit.com/api/v1/authorize"]},
								{"site" : "instagram", "regex" : /instagram/gi, "url" : ["https://api.instagram.com/oauth/authorize"]},
								{"site" : "foursquare", "regex" : /foursquare/gi, "url" : ["https://foursquare.com/oauth2/authorize"]},
								{"site" : "fitbit", "regex" : /fitbit/gi, "url" : ["https://www.fitbit.com/oauth2/authorize"]},
								{"site" : "imgur", "regex" : /imgur/gi, "url" : ["https://api.imgur.com/oauth2/authorize"]},
								{"site" : "salesforce", "regex" : /salesforce/gi, "url" : ["https://login.salesforce.com/services/oauth2/authorize"]},
								{"site" : "strava", "regex" : /strava/gi, "url" : ["https://www.strava.com/oauth/authorize"]},
								{"site" : "battle.net", "regex" : /battle.net/gi, "url" : ["https://us.battle.net/oauth/authorize"]}]
							var k0 = /oauth/gi;
							var k1 = /openid/gi
							var k2 = /log[\-\s]*[io]+n[\-\s]*[with]+[using]+/gi;
							var k3 = /sign[\-\s]*[io]+n[\-\s]*[with]+[using]+/gi;
							var k4 = /sign[\-\s]*[up]+[\-\s]*[with]+[using]+/gi;
							var k5 = /register[\-\s]*[up]+[\-\s]*[with]+[using]+/gi;
							var k6 = /create[\-\s]*[up]+[\-\s]*[with]+[using]+/gi;

							var len = sso.length;
							var i = 0;

			                while(i < len){
				                var each = sso[i];
				                var siteMatch = inputstr.match(each.regex);
				                if(siteMatch != null){
				                    var authMatch = inputstr.match(k0);
				                    var openMatch = inputstr.match(k1);
				                    if(authMatch != null){
				                        var urlList = each.url;
				                        var urlLen = urlList.length;
				                        if(urlLen > 0){
				                            for(var j=0; j < urlLen; j++){
				                                var urlMatch = inputstr.match(urlList[j]);
				                                if(urlMatch != null){
				                                    return each.site+", oauth";
				                                }
				                            }
				                        }
				                    }else if(openMatch != null){
				                        return each.site+", openid";
				                    }else{
				                        if(inputstr.match(k2) != null || inputstr.match(k3) != null  || inputstr.match(k4) != null || 
				                            inputstr.match(k5) != null || inputstr.match(k6) != null){
				                            return each.site+', edgecase';
				                        }
				                    }
				                }
				                i++;
				            }
				        },
				        limitLinks : function(links){
				        	var filtered = [];
				  			var len = links.length;
				        	for(var i = 0; i < len; i++){
				        		if((/^http/gi).test(links[i])){
				        			filtered.push(links[i]);
				        		}
				        	}
				        	if(filtered.length == 0){
				        		for(var i = 0; i < len; i++){
				        			var each = links[i];
				        			if(each[0] == '/' && each[1] == '/'){
				        				each = "https:" + each;
				        				filtered.push(each);
				        			}else if(each[0] == '/' && each[1] != '/'){
				        				each = "https://" + window.location.hostname + each;
				        				filtered.push(each);
				        			}
				        		}
				        	}
				        	Array.prototype.contains = function(v){
							    for(var i = 0; i < this.length; i++) {
							        if(this[i] === v) return true;
							    }
							    return false;
							};
							Array.prototype.unique = function(){
							    var arr = [];
							    for(var i = 0; i < this.length; i++) {
							        if(!arr.contains(this[i])) {
							            arr.push(this[i]);
							        }
							    }
							    return arr; 
							};
							var uniq = filtered.unique();
							return uniq;
				        },
				        makeNewLinks : function(){
				        	var arr = ["https://" + window.location.hostname + '/login', 
				        	"https://" + window.location.hostname + '/signup'];
				        	return arr;
				        }
					};
					return fns.processDOM();
				})
				.end()
				.then(function (result) {
					var resObj = {"pageResults" : [], "pageTime" : {}};
				  	if(result){
				  		ssoInfo.sso = result.candidates;
				  		if(ssoInfo['sso'].length > 0) resObj['pageResults'].push(ssoInfo);
				  		if(result.links.length > 3) result.links = result.links.slice(0, 3);
				  		links = links.concat(result.links);
				  	}
				  	var end = Date.now();
				  	var time = {"url" : link, "timeTaken" : (end - start)+"ms"};
				  	resObj['pageTime'] = time;
				  	results.push(resObj);
					return results;
				})
				.catch(function (error) {
					console.error('run');
				   	console.error('Search failed:', error);
				    results.push(error);
					return results;
				});
		});
	}, Promise.resolve([])).then(function(results){
    	console.log(results);
    	rerun(links);
	});
}

function rerun(links){
	var len = 0;
	
	links.reduce(function(accumulator, url) {
  		return accumulator.then(function(results) {
			console.log('hi');
			var each = url;
			var ssoInfo = {"url" : each, "sso" : []};
			var start = Date.now();
			var nightmare = Nightmare({
				gotoTimeout : 30000,
				show : false
			});
			return nightmare
				.goto(each)
				.evaluate(function(){
					window.fns = {
						prefilter : function(node){
				    		var bool = true;
			                if (node.nodeName != "A" && node.nodeName != "DIV" && node.nodeName != "IMG" &&
			                    node.nodeName != "SPAN" && node.nodeName != "INPUT" &&
			                    node.nodeName != "BUTTON") bool = false;
			                if (node.nodeName == "INPUT") {
			                    if (node.type != "button" && node.type != "img" &&
			                        node.type != "submit") bool = false;
			                }
			                if (node.nodeName == "A") {
			                    if (node.href.toLowerCase().indexOf('mailto:') == 0) bool = false;
			                }
			                return bool;
				    	},
						processDOM : function(){
							var tree = []; var candidates = []; var sites = []; var result = {"candidates" : [], "links" : []};
				    		tree.push(document.body);
				    		while(tree.length > 0){
				    			var branch = tree.pop();
				    			if(branch != null){
				    				var children = branch.children;
				    				if(children){
				    					var arr = [].slice.call(children);
					    				tree = tree.concat(arr);
				    				}
				    				if(!(branch.attributes == null || branch.nodeName == 'SCRIPT' || branch.nodeName == 'EMBED')){
										if(this.prefilter(branch)){
											var sso = this.hasSSO(branch);
				    						if(sso){
				    							if(candidates.indexOf(sso) == -1) candidates.push(sso);
				    						}
										}
									}
								}
							}
							result.candidates = candidates;
				    		return result;
						},
				    	makeAttrString : function(node){
				    		var str = '';
			                var attribs = node.attributes;
			                for(var i=0; i < attribs.length; i++){
			                    str += attribs[i].name + "=" + attribs[i].value + ";"
			                }
			                return str;
				    	},
				    	hasSSO : function(node){
				    		var attrStr = this.makeAttrString(node);
				    		var result = this.checkSSOWords(attrStr);
				    		if(result) return result;
				    	},
				    	checkSSOWords : function(inputstr){
				    		var sso = [{"site" : "google", "regex" : /google/gi, "url" : ["https://accounts.google.com/o/oauth2/auth"]}, 
								{"site" : "yahoo", "regex" : /yahoo/gi, "url" : ["https://api.login.yahoo.com/oauth2/request_auth"]}, 
								{"site" : "500px", "regex" : /500px/gi, "url": ["https://api.500px.com/v1/oauth"]}, 
								{"site" : "aol", "regex" : /aol/gi, "url" :["https://api.screenname.aol.com/auth"]}, 
								{"site" : "twitter", "regex" : /twitter/gi, "url" : ["https://api.twitter.com/oauth"]}, 
								{"site" : "vk", "regex" : /vk/gi, "url" : ["https://oauth.vk.com/authorize"]}, 
								{"site" : "yammer", "regex" : /yammer/gi, "url" : ["https://www.yammer.com/oauth2/authorize"]}, 
								{"site" : "yandex", "regex" : /yandex/gi, "url" : ["https://oauth.yandex.com/authorize"]},
								{"site" : "zendesk", "regex" : /zendesk/gi, "url" : [".zendesk.com/oauth/authorizations/new"]}, 
								{"site" : "amazon", "regex" : /amazon/gi, "url" : ["http://g-ecx.images-amazon.com/images/G/01/lwa/btnLWA", "https://images-na.ssl-images-amazon.com/images/G/01/lwa/btnLWA"]},
								{"site" : "flickr", "regex" : /flickr/gi, "url" : ["https://www.flickr.com/services/oauth"]}, 
								{"site" : "bitbucket", "regex" : /bitbucket/gi, "url" : ["https://bitbucket.org/site/oauth2", "https://bitbucket.org/api/1.0/oauth"]}, 
								{"site" : "bitly", "regex" : /bitly/gi, "url" : ["https://bitly.com/oauth"]}, 
								{"site" : "cloud foundry", "regex" : /cloud[\-\s]*foundry/gi, "url" : ["/uaa/oauth"]}, 
								{"site" : "dailymotion", "regex" : /dailymotion/gi, "url" : ["https://www.dailymotion.com/oauth"]}, 
								{"site" : "deviantart", "regex" : /deviantART/gi, "url" : ["https://www.deviantart.com/oauth2"]}, 
								{"site" : "discogs", "regex" : /discogs/gi, "url" : ["https://api.discogs.com/oauth"]}, 
								{"site" : "huddle", "regex" : /huddle/gi, "url" : ["https://login.huddle.net/request"]}, 
								{"site" : "netflix", "regex" : /netflix/gi, "url" : ["https://api-user.netflix.com/oauth"]}, 
								{"site" : "openlink data spaces", "regex" : /openlink[\-\s]*data[\-\s]*spaces/gi, "url" : ["/OAuth"]}, 
								{"site" : "openstreetmap", "regex" : /openstreetmap/gi, "url" : ["http://www.openstreetmap.org/oauth"]}, 
								{"site" : "opentable", "regex" : /opentable/gi, "url" : ["http://www.opentable.com/oauth"]}, 
								{"site" : "passport", "regex" : /passport/gi, "url" : ["/dialog/authorize", "oauth2/authorize", "oauth/authorize"]},
								{"site" : "paypal", "regex" : /paypal/gi, "url" : ["paypal.com/v1/oauth2"]}, 
								{"site" : "plurk", "regex" : /plurk/gi, "url" : ["https://www.plurk.com/OAuth/authorize"]},
								{"site" : "sina weibo", "regex" : /sina[\-\s]*weibo/gi, "url" : ["http://api.t.sina.com.cn/oauth/authorize"]},
								{"site" : "stackexchange", "regex" : /stack[\-\s]*exchange/gi, "url" : ["https://stackexchange.com/oauth"]}, 
								{"site" : "statusnet", "regex" : /statusnet/gi, "url" : ["status.net/api/oauth/authorize"]}, 
								{"site" : "ubuntu one", "regex" : /ubuntu[\-\s]*one/gi, "url" : ["https://login.ubuntu.com/api/1.0/authentications"]},
								{"site" : "viadeo", "regex" : /viadeo/gi, "url" : ["https://partners.viadeo.com/oauth/authorize"]},
								{"site" : "vimeo", "regex" : /vimeo/gi, "url" : ["https://api.vimeo.com/oauth/authorize"]}, 
								{"site" : "withings", "regex" : /withings/gi, "url" : ["https://oauth.withings.com/account/authorize"]},
								{"site" : "xero", "regex" : /xero/gi, "url" : ["https://api.xero.com/oauth/Authorize"]},
								{"site" : "xing", "regex" : /xing/gi, "url" : ["https://api.xing.com/v1/authorize"]}, 
								{"site" : "goodreads", "regex" : /goodreads/gi, "url" : ["http://www.goodreads.com/oauth"]}, 
								{"site" : "google app engine", "regex" : /google[\-\s]*app[\-\s]*engine/gi, "url" : ["https://accounts.google.com/o/oauth2/v2/auth"]},
								{"site" : "groundspeak", "regex" : /groundspeak/gi, "url" : ["groundspeak.com/oauth"]}, 
								{"site" : "intel cloud services", "regex" : /intel[\-\s]*cloud[\-\s]*services/gi, "url" : []}, 
								{"site" : "jive", "regex" : /jive/gi, "url" : ["jiveon.com/oauth2"]}, 
								{"site" : "linkedin", "regex" : /linkedin/gi, "url" : ["https://www.linkedin.com/oauth/v2/authorization"]}, 
								{"site" : "trello", "regex" : /trello/gi, "url" : ["https://trello.com/1/OAuthAuthorizeToken", "https://trello.com/1/authorize"]}, 
								{"site" : "tumblr", "regex" : /tumblr/gi, "url" : ["https://www.tumblr.com/oauth/authorize"]}, 
								{"site" : "microsoft", "regex" : /microsoft/gi, "url" : ["https://login.live.com/oauth20"]},
								{"site" : "mixi", "regex" : /mixi/gi, "url" : ["api.mixi-platform.com/OAuth"]}, 
								{"site" : "myspace", "regex" : /myspace/gi, "url" : ["api.myspace.com/authorize"]}, 
								{"site" : "etsy", "regex" : /etsy/gi, "url" : ["https://www.etsy.com/oauth"]}, 
								{"site" : "evernote", "regex" : /evernote/gi, "url" : ["https://sandbox.evernote.com/OAuth.action"]},  
								{"site" : "yelp", "regex" : /yelp/gi, "url" : ["https://api.yelp.com/oauth2"]},  
								{"site" : "facebook", "regex" : /facebook/gi, "url" : ["fb-login-button", "https://www.facebook.com/v2.0/dialog/oauth",  "https://www.facebook.com/v2.3/dialog/oauth", "https://graph.facebook.com/v2.8/oauth/authorize"]},
								{"site" : "dropbox", "regex" : /dropbox/gi, "url" : ["https://www.dropbox.com/1/oauth2/authorize", "https://www.dropbox.com/1/oauth/authorize"]}, 
								{"site" : "twitch", "regex" : /twitch/gi, "url" : ["https://api.twitch.tv/kraken/oauth2/authorize"]},
								{"site" : "stripe", "regex" : /stripe/gi, "url" : ["https://connect.stripe.com/oauth/authorize"]},
								{"site" : "basecamp", "regex" : /basecamp/gi, "url" : ["https://launchpad.37signals.com/authorization/new"]},
								{"site" : "box", "regex" : /box/gi, "url" : ["https://account.box.com/api/oauth2/authorize"]},
								{"site" : "formstack", "regex" : /formstack/gi, "url" : ["https://www.formstack.com/api/v2/oauth2/authorize"]},
								{"site" : "github", "regex" : /github/gi, "url" : ["https://github.com/login/oauth/authorize"]},
								{"site" : "reddit", "regex" : /reddit/gi, "url" : ["https://www.reddit.com/api/v1/authorize"]},
								{"site" : "instagram", "regex" : /instagram/gi, "url" : ["https://api.instagram.com/oauth/authorize"]},
								{"site" : "foursquare", "regex" : /foursquare/gi, "url" : ["https://foursquare.com/oauth2/authorize"]},
								{"site" : "fitbit", "regex" : /fitbit/gi, "url" : ["https://www.fitbit.com/oauth2/authorize"]},
								{"site" : "imgur", "regex" : /imgur/gi, "url" : ["https://api.imgur.com/oauth2/authorize"]},
								{"site" : "salesforce", "regex" : /salesforce/gi, "url" : ["https://login.salesforce.com/services/oauth2/authorize"]},
								{"site" : "strava", "regex" : /strava/gi, "url" : ["https://www.strava.com/oauth/authorize"]},
								{"site" : "battle.net", "regex" : /battle.net/gi, "url" : ["https://us.battle.net/oauth/authorize"]}]
							var k0 = /oauth/gi;
							var k1 = /openid/gi
							var k2 = /log[\-\s]*[io]+n[\-\s]*[with]+[using]+/gi;
							var k3 = /sign[\-\s]*[io]+n[\-\s]*[with]+[using]+/gi;
							var k4 = /sign[\-\s]*[up]+[\-\s]*[with]+[using]+/gi;
							var k5 = /register[\-\s]*[up]+[\-\s]*[with]+[using]+/gi;
							var k6 = /create[\-\s]*[up]+[\-\s]*[with]+[using]+/gi;

							var len = sso.length;
							var i = 0;
			                while(i < len){
				                var each = sso[i];
				                var siteMatch = inputstr.match(each.regex);
				                if(siteMatch != null){
				                    var authMatch = inputstr.match(k0);
				                    var openMatch = inputstr.match(k1);
				                    if(authMatch != null){
				                        var urlList = each.url;
				                        var urlLen = urlList.length;
				                        if(urlLen > 0){
				                            for(var j=0; j < urlLen; j++){
				                                var urlMatch = inputstr.match(urlList[j]);
				                                if(urlMatch != null){
				                                    return each.site+", oauth";
				                                }
				                            }
				                        }
				                    }else if(openMatch != null){
				                        return each.site+", openid";
				                    }else{
				                        if(inputstr.match(k2) != null || inputstr.match(k3) != null  || inputstr.match(k4) != null || 
				                            inputstr.match(k5) != null || inputstr.match(k6) != null){
				                            return each.site+', edgecase';
				                        }
				                    }
				                }
				                i++;
				            }
				        }
					};
					return fns.processDOM();
				})
				.end()
				.then(function (result) {
					var reruns = {"pageResults" : [], "pageTime" : {}};
				  	if(result){
				  		ssoInfo.sso = result.candidates;
				  		if(ssoInfo['sso'].length > 0) reruns['pageResults'].push(ssoInfo);
				  	}
				  	visited.push(each);
				  	var end = Date.now();
				  	var time = {"url" : each, "timeTaken" : (end - start)+"ms"};
				  	reruns['pageTime'] = time;
				  	results.push(reruns);
				  	return results;
				})
				.catch(function (error) {
					console.error('rerun');
				   console.error('Search failed:', error);
				   results.push(error);
				   return results;
				});
		});
	}, Promise.resolve([])).then(function(results){
    	console.log(results);
	});
}

// Write or read from file functions
function write(data, type){
	try{		
		switch(type){
			case 0 : fs.appendFile('../data/log-summa.txt', JSON.stringify(data)+"\n", function(isDone){});
					break;
			case 1 : fs.appendFile('../data/errors.txt', JSON.stringify(data)+"\n", function(isDone){});
					break;
			case 2 : fs.appendFile('../data/times.txt', JSON.stringify(data)+"\n", function(isDone){});
					break;
			default : break;
		}
	}catch(e){
		console.log("Write file error : " + e);
	}
}

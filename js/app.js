$(document).ready(function(){
    $('.sources-dropdown').append("<li><a href='#' id='reddit'> Reddit </a></li>");
  $('.sources-dropdown').append("<li><a href='#' id='digg'> Digg </a></li>");
  $('.sources-dropdown').append("<li><a href='#' id='mashable'> Mashable </a></li>");
  $('.sources-dropdown').append("<li><a href='#' id='buzzfeed'> BuzzFeed </a></li>");

  // Array to store all feed sources
  var SOURCES = [
    {
      displayName: "Reddit",
      url: "https://www.reddit.com/r/worldnews/top/.json",
      proxyRequired: false,
      defaultSource: true, // You can have only one default source
      formatResponse: function(response) {
        return _.map(response.data.children, function(child) {
          return {
            title: child.data.title,
            author: child.data.author,
            score: child.data.score,
            link: child.data.url,
            thumbnail: child.data.thumbnail,
            tag: child.data.subreddit,
            description: child.data.domain

          };
        });
      }
    },
    {
      displayName: "Digg",
      url: "http://digg.com/api/news/popular.json",
      proxyRequired: true,
      defaultSource: false,
      formatResponse: function (response) {
        var articles = response.data.feed;
        return _.map(articles, function (article) {
          return {
            description: article.content.description,
            score: article.digg_score,
            link: article.content.url,
            tag: article.content.kicker,
            title: article.content.title,
            thumbnail: article.content.media.images[0].url
          }
        });
      }
    },
    {
      displayName: "Mashable",
      url: "http://mashable.com/stories.json",
      proxyRequired: true,
      defaultSource: false,
      formatResponse: function(response){
        var articles = response.new;
        return _.map(articles, function(article) {
          return {
            description: article.content.plain,
            score: article.shares.total,
            link: article.link,
            tag: article.channel,
            title: article.title,
            thumbnail: article.responsive_images[2].image
          }
        });

      }
    },
    {
      displayName: "Buzzfeed",
      url: "https://newsapi.org/v1/articles?source=buzzfeed&sortBy=top&apiKey=4bd32ab2c31346d8ae711b9c0b14f6b7",
      proxyRequired: false,
      defaultSource: false,
      formatResponse: function(response){
        var articles = response.articles;
        return _.map(articles, function (article){
          return{
            description: article.description,
            score: article.author,
            link: article.url,
            title: article.title,
            tag: article.publishedAt,
            thumbnail: article.urlToImage

          }
        })
      }

    }
  ];

  // Prefix url for proxy
  var PROXY_URL = "https://accesscontrolalloworiginall.herokuapp.com/";

  // Utils object to store any misc. methods
  var Utils = {
    getArticlesMarkup: function(articles) {
      var articleMarkupArray = _.map(articles, function(article) {
        return Utils.getSingleArticleMarkup(article);
      });

      return articleMarkupArray.join('');
    },
    getSingleArticleMarkup: function(article) {
      return Utils.articleTemplate(article);
    },
    articleTemplate: _.template(
        '<article class="article clearfix">' +
        '<section class="featuredImage">' +
        '<img src="<%= thumbnail %>" alt=""></section>' +
        '<section class="articleContent">' +
        '<a href="<%= link %>"> <h3><%= title %></h3></a>' +
        '<h6><%= tag %></h6>' +
        '</section>' +
        '<section class="impressions"><%= score %></section>' +
        '</article>'
    ),

    // --------------- Search engine
     fuzzysearch: function (needle, haystack) {
    var hlen = haystack.length;
    var nlen = needle.length;
    if (nlen > hlen) {
      return false;
    }
    if (nlen === hlen) {
      return needle === haystack;
    }
    outer: for (var i = 0, j = 0; i < nlen; i++) {
      var nch = needle.charCodeAt(i);
      while (j < hlen) {
        if (haystack.charCodeAt(j++) === nch) {
          continue outer;
        }
      }
      return false;
    }
    return true;
  }
 //----------


  };

  // App object to store all app relates metods
  var App = {


    init: function() {
      // Methods that need to be called on initialization
      App.bindEvents();
      App.showDefaultFeed();
    },
    bindEvents: function() {
      // Attach event listeners
      // -------- change resourse of feed
      $("#reddit").on("click", function(){
        var currentFeed = _.findWhere(SOURCES, {displayName: "Reddit"});
        if(currentFeed) App.showFeed(currentFeed);
        else alert("Sorry, can't load feeds from current source")
      });
      $("#mashable").on("click", function(){
        var currentFeed = _.findWhere(SOURCES, {displayName: "Mashable"});
        if(currentFeed) App.showFeed(currentFeed);
        else alert("Sorry, can't load feeds from current source")
      });
      $("#digg").on("click", function(){
        var currentFeed = _.findWhere(SOURCES, {displayName: "Digg"});
        if(currentFeed) App.showFeed(currentFeed);
        else alert("Sorry, can't load feeds from current source")
      });
      $("#buzzfeed").on("click", function(){
        var currentFeed = _.findWhere(SOURCES, {displayName: "Buzzfeed"});
        if(currentFeed) App.showFeed(currentFeed);
        else alert("Sorry, can't load feeds from current source")
      });
        //--------------------

      //------ set event on logo
      $(".logo").on("click", function(){
        App.showDefaultFeed();
      });
      //--------------

      // --------- Toggle active class on search box
      $("#search a").on("click", function(){
        $("#search").toggleClass("active");
      });

      //-----------------------


      //-------------- make search box inactive on Enter click event
      $("#search").keydown(function(event){
        if(event.which == 13){
          if($("#search").hasClass("active")){
            $("#search").removeClass("active");
          }
        }
      });
      //----------------------
      // set close button event
        $(".closePopUp").on("click", function(){
          App.setView('feed');

        });
      //---------------

      //-------- setView detail on clicked article
      $('#main').on('click', '.articleContent a', function(e) {
        e.preventDefault();
        var index = $(this).parent().parent().index();
       var article =  App.currentArticles[index];
       $('#popUp .container').find('h1').text(article.title);
        $('#popUp .container').find('p').text(article.tag);
        $('#popUp .container').find('a').attr("href", article.link);
        App.setView('detail');
      });

      //------------------
      //----------- Function create 2 parametrs for fuzzysearch
     var check = function() {
       var inp = $("#search input").val(); //input value from search box
       inp.toLowerCase();               // make it case insensitive
       var numberOfArticles = App.currentArticles.length;         // number of current displayed articles
       var compare;                 // title of current article for loop
       var searchArticles = [];      // array of articles, which returns to true from fuzzysearch function
       for (var i = 0; i < numberOfArticles; i++){
        compare = App.currentArticles[i].title;  // take title of all articles in order
         compare.toLowerCase();       // make it case insensitive
         if(Utils.fuzzysearch(inp, compare)){        // check if fuzzysearch returns true
           searchArticles.push(App.currentArticles[i]);    //push article which evaluates to true from fuzzysearch in
                                                            // searchArticles array
         }
        App.renderFeed(searchArticles);       // calling renderFeed function, that display articles from array

       }
     };

      var inputText = _.debounce(check, 500);     // debounce method
      $("#search input").keyup(inputText);        // event for calling debounce method

      //-----------------------------------


    },
    currentArticles: [],



    showDefaultFeed: function() {
      var defaultFeed = _.findWhere(SOURCES, { defaultSource: true });
      App.showFeed(defaultFeed);
    },
    showFeed: function(feed) {
      var request = App.requestFeed(feed);
      request.done(function(response) {
        var currentArticles = feed.formatResponse(response);
        App.currentArticles = currentArticles;
        App.setView('feed');
        App.renderFeed(currentArticles);
      });
    },
    requestFeed: function(feed) {
      // return jqXHR object for request
      App.setView('loader');
      var url = feed.proxyRequired ? PROXY_URL + feed.url : feed.url;

      return $.ajax(url, {
        dataType: 'json'
      });
    },
    renderFeed: function(articles) {
      var articlesMarkup = Utils.getArticlesMarkup(articles);
      $("#main").html(articlesMarkup);
    },
    setView: function(viewType) {
      var $popup = $('#popUp');
      var $closePopUp = $('.closePopUp');

      if (viewType === 'loader') {
        $popup.removeClass('hidden');
        $closePopUp.addClass('hidden');
        $popup.addClass('loader');
      }
      else if (viewType === 'detail') {
        $popup.removeClass('hidden');
        $closePopUp.removeClass('hidden');
        $popup.removeClass('loader');
      }
      else if (viewType === 'feed') {
        $popup.addClass('hidden');
        $closePopUp.addClass('hidden');
      }
    }
  };

  App.init();
});



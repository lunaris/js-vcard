var express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    vcard = undefined;

var action = function(method) {
  return function(rel, path, handler) {
    return { method: method, rel: rel, path: path, handler: handler };
  };
};

var remove = action('delete'),
    get = action('get'),
    post = action('post'),
    put = action('put');

var allActions = {
  getRoot: get('Root', '', function(req) {
    return {};
  }),
  getExample: get('Example', 'example', function(req) {
    return {
      forename: 'Forename',
      surname: 'Surname',
      email: 'user@example.com'
    };
  }),
  putPersonalDetails: put('PersonalDetails', 'personal-details', function(req) {
    vcard = {
      forename: req.body.forename,
      surname: req.body.surname
    };
  }),
  putEmail: put('Email', 'email', function(req) {
    vcard.email = req.body.email;
  }),
  getVcard: get('Vcard', 'vcard', function(req) {
    return vcard;
  })
};

var allStates = {
  root: function(vcard) {
    return {
      actions: function() {
        var actions = ['getExample'];
        if (vcard !== undefined) {
          actions.push('getVcard');
        }
        else {
          actions.push('getVcard');
        }

        return actions;
      },
      transition: function(action, resource) {
        return action.name === 'getExample' ?
          allStates.personalDetailsCollection() :
          this;
      }
    };
  },
  personalDetailsCollection: function() {
    return {
      actions: function() {
        return ['putPersonalDetails'];
      },
      transition: function(action, resource) {
        return allStates.emailCollection();
      }
    };
  },
  emailCollection: function() {
    return {
      actions: function() {
        return ['putEmail'];
      },
      transition: function(action, resource) {
        return allStates.root(vcard);
      }
    };
  }
};

var currentState = allStates.root();

var absolutePath = function(req, path) {
  return req.protocol + '://' + req.headers.host + '/' + path;
};

var linksFor = function(req, actions) {
  var links = {};
  for (var i = 0; i < actions.length; ++i) {
    var action = allActions[actions[i]];
    links[action.rel] = {
      rel: action.rel,
      href: absolutePath(req, action.path),
      methods: [action.method]
    };
  }

  return links;
};

var makeActionHandler = function(action) {
  return function(req, res) {
    var resource = action.handler(req) || {};

    currentState = currentState.transition(action, resource);
    var actions = currentState.actions();

    resource._links = linksFor(req, actions);
    res.send(resource);
  };
};

app.use(bodyParser());

for (var name in allActions) {
  var action = allActions[name];
  app[action.method]('/' + action.path, makeActionHandler(action));
}

app.listen(3000);

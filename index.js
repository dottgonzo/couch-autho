var app = require('express')();
var server = require('http').Server(app);
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var cors = require('cors');
var pathExists= require('path-exists');
if (!pathExists.sync('./conf.json')){
  throw Error('no configuration founded')
}
var conf=require('./conf.json')
var couchapi=require('./modules/couchApi');
var mailer=require('./modules/mailer');
var jwt = require('jsonwebtoken');
var rpj = require('request-promise-json');


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

app.use(cookieParser())
app.use(cors());



server.listen(conf.port,'0.0.0.0');





app.post('/authm', function (req, res) {

  var token=req.body.token;
  var decoded = jwt.verify(token, config.secret,{ignoreExpiration:true});

  if(decoded&&decoded.user&&decoded.password){
    request.get(couch_url+'/_users/org.couchdb.user:'+username, function(error, response, body) {
      if (!error && response.statusCode == 200) {

        res.json({user:'present',password:decoded.password,db:JSON.parse(body).app.db});
      }else{
        res.json({warning:'token error'});
      }
    })
  }
})

app.post('/createmachine', function (req, res) {
  var username=req.body.username;
  var app_id=req.body.app_id;
  var passw=req.body.passw;
  var label=req.body.label;

  request.get(couch_url+'/_users/org.couchdb.user:'+username, function(error, response, body) {
    if (!error && response.statusCode == 200) {


      var doc=JSON.parse(body);

      var oldbs=JSON.parse(body).db;

      var machine=false;

      for(var i=0;i<oldbs.length;i++){
        if (oldbs[i].app_id==app_id&&oldbs[i].dbtype=='machine'&&oldbs[i].label==label){
          machine=oldbs[i].dbname;
        }
      }

      if (machine){
        res.json({warning:'present'});

      } else{
        for(var i=0;i<oldbs.length;i++){
          if (oldbs[i].app_id==app_id&&oldbs[i].dbtype=='mine'){
            dbuser=oldbs[i].dbname;
            dbslaveuser=oldbs[i].slave.username;
            dbslavepassword=oldbs[i].slave.password;

          }
        }
        request.get(config.couchdb.internal_url.protocol+'://'+username+':'+passw+'@'+couch_domain_with_port+'/'+oldbs[0].dbname, function(error, response, body) {

          if (!error && response.statusCode == 200) { // ok crealo

            var newuserdb=gen_db('machine',{app_id:app_id});

            var info = JSON.parse(body);
            var slavename='slmach_'+username+'_'+uid(6);
            var slavepassword=uid(12);


            var token = jwt.sign({ user: slavename, password: slavepassword }, config.secret);
            var newdb={app_id:app_id,dbname:newuserdb,slave:{username:slavename,password:slavepassword,token:token},label:label,dbtype:"machine",roles:['owner']};




            request({
              method: "PUT",
              uri: couch_url+'/_users/org.couchdb.user:'+slavename,
              json: {"name": slavename,"roles": ['slave'],app:{db:newuserdb,users:[username]},dbtype:"userslave","type": "user","password": slavepassword}
            }, function(error, response, body) {

              doc.db.push(newdb)


              request({
                method: "PUT",
                uri: couch_url+'/_users/org.couchdb.user:'+username,
                json: doc
              }, function(error, response, body) {
                console.log(body) // Show the HTML for the Google homepage.

                console.log('ooo') // Show the HTML for the Google homepage.

                request.put(couch_url+'/'+newuserdb, function(error, response, body) {
                  console.log(body) // Show the HTML for the Google homepage.



                  request({
                    method: "PUT",
                    uri: couch_url+'/'+newuserdb+'/_security',
                    json: {"members":{"names":[username,slavename],"roles":[] } }
                  }, function(error, response, body) {
                    console.log(body) // Show the HTML for the Google homepage.


                    confirmDB.post({confirm:false}).then(function(doc){
                      //  registerMail('darioyzf@gmail.com',doc.id); // TO BE ALIVE

                    }).catch(function(err){

                      res.json({error:'boh'});

                    });


                    res.json({success:true,data:{database:newuserdb,slave:{user:slavename,password:slavepassword},label:label}});


                  })

                })


              })



            })







          } else{

            res.json({error:'wrong password'});




          }

        })


      }


    } else{

      res.json({error:'wrong username'});

    }
  })
})



function getuser_machines(username,passw,app_id,cb){



  testapp_id(app_id,function(data){
    if(data.ok){


      testauth(username,passw,function(data){

        if(data.ok){
          request.get(couch_url+'/_users/org.couchdb.user:'+username, function(error, response, body) {

            var doc=JSON.parse(body);

            var oldbs=JSON.parse(body).db;

            var oldb=false;
            var machines=[]
            for(var i=0;i<oldbs.length;i++){
              if (oldbs[i].app_id==app_id&&oldbs[i].dbtype=='machine'){
                oldbs[i].slave.database=oldbs[i].dbname;
                oldbs[i].slave.label=oldbs[i].label;
                machines.push(oldbs[i].slave);
              }
            }

            cb(machines)



          })


        } else{
          cb(data)

        }

      })




    } else{
      cb(data)

    }
  })


}

app.post('/getmachines', function (req, res) {
  var username=req.body.username;
  var app_id=req.body.app_id;
  var passw=req.body.passw;


  getuser_machines(username,passw,app_id,function(data){
    res.json({data:data})

  })

})

app.post('/auth', function (req, res) {

  var email=req.body.email;
  var username=req.body.username;
  var app_id=req.body.app_id;

  var passw=req.body.passw;
  console.log(app_id)


  if (req.body.register && req.body.register== 'true'){
    var newuserdb=gen_db('member',{username:username,app_id:app_id});



  } else { // todo autentica con jwt

    var newuserdb=false;

  }

  console.log(gen_db('member',{username:username,app_id:app_id})+'dd');

  request.get(couch_url+'/_users/org.couchdb.user:'+username, function(error, response, body) {


    if (!error && response.statusCode == 200) {

      var doc=JSON.parse(body);

      var oldbs=JSON.parse(body).db;

      var oldb=false;

      for(var i=0;i<oldbs.length;i++){
        if (oldbs[i].app_id==app_id&&oldbs[i].dbtype=='mine'){
          oldb=oldbs[i].dbname;
          slavedb=oldbs[i].slave;
        }
      }



      request.get(config.couchdb.internal_url.protocol+'://'+username+':'+passw+'@'+couch_domain_with_port+'/'+oldbs[0].dbname, function(error, response, body) {


        if (!error && response.statusCode == 200) { // ok crealo








          if (newuserdb && oldb){ // tenta di registrare un db esistente, restituisce il vecchio
            res.json({warning:'present'});
          } else if(newuserdb && oldbs[0] && oldbs[0].dbname){ // vuol creare un nuovo db (è un utente preesistente)


            putapp(app_id,username,function(status){

              res.json(status);


            })




          } else if(oldb){ // login puro



            console.log(body);
            var profile={
              user:username,
              app_id:app_id,
              email:doc.email
            }


            authorizesocket(res,profile,200);



          } else if(!newuserdb && !oldb && oldbs[0]) {
            res.json({error:'wrong app'});


          }

        } else { // error
          res.json({error:'wrong username/password'});

        }


      })

    } else if (newuserdb && email){ // nuovo utente
      var info = JSON.parse(body);

      var slavename='sl_'+username+'_'+uid(6);
      var slavepassword=uid(12);

      request.get(couch_url+'/app_'+app_id, function(error, response, body) { // register to this app

        if (!error && response.statusCode == 200) {

          request({
            method: "PUT",
            uri: couch_url+'/_users/org.couchdb.user:'+slavename,
            json: {"name": slavename,"roles": ['slave'],app:{db:newuserdb,user:username},dbtype:"userslave","type": "user","password": slavepassword}
          }, function(error, response, body) {


            //  registerMail('darioyzf@gmail.com',doc.id); // TO BE ALIVE




            var doc={"name": username,"email":email,"db":[{app_id:app_id,dbname:newuserdb,slave:{username:slavename,password:slavepassword},dbtype:"mine",roles:['owner']}],"roles": ['user'],"type": "user","password": passw};


            request({
              method: "PUT",
              uri: couch_url+'/_users/org.couchdb.user:'+username,
              json: doc
            }, function(error, response, body) {

              request.put(couch_url+'/'+newuserdb, function(error, response, body) {


                request({
                  method: "PUT",
                  uri: couch_url+'/'+newuserdb+'/_security',
                  json: {"members":{"names":[username,slavename],"roles":[] } }
                }, function(error, response, body) {
                  console.log(body)


                  confirmDB.post({confirm:false}).then(function(doc){
                    //  registerMail('darioyzf@gmail.com',doc.id); // TO BE ALIVE

                  }).catch(function(err){

                    res.json({error:'boh'});

                  });




                  var profile={
                    user:username,
                    app_id:app_id,
                    email:doc.email
                  }


                  authorizesocket(res,profile,200);
                })

              })


            })


          }) // fine sottoscrizione app


        } else {
          console.log('error: new user tried to create new app')
          res.json({error:'new user can\'t create app'});

        }
      })





    } else {


      res.json({error:'wrong username'});


    }


  });

});




app.get('/reset', function (req, res) {
  console.log(req.query);

  var code=req.query.code;
  console.log(code);
  if (req.body && code){
    resetDB.get(code).then(function(doc){
      console.log(doc);

      confirmDB.remove(doc).then(function(){

        res.redirect('/page/auth.html?reset='+code);


      }).catch(function(err){

        console.log(err);

      });

    }).catch(function(err){



    })


  }



});





app.get('/confirm', function (req, res) {
  console.log(req.query);

  var code=req.query.code;
  console.log(code);
  if (req.body && code){
    confirmDB.get(code).then(function(doc){
      console.log(doc);

      doc.confirm=true;
      confirmDB.put(doc).then(function(){

        res.redirect('/ready.html');
        notifyMail('darioyzf@gmail.com');

      }).catch(function(err){

        console.log(err);

      });

    }).catch(function(err){



    })


  }



});

const spawnPouchdbServer = require('spawn-pouchdb-server');

    spawnPouchdbServer(
        {
            port: 8741,
            backend: false,
            config: {
                admins: { "adminuser": "adminpass" },
                file: false
            },
            log: {
                file: false,
                level: 'none'
            }
        }, function (error, server) {
            if (error) {
                throw error;

            } else {

  console.log('started')
            }
        })
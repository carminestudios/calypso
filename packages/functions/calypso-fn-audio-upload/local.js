/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
const fastify = require('fastify')();
const concat = require('concat-stream');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

fastify.register(require('fastify-multipart'));

fastify.put('/upload', (req, reply) => {
  const handler = (field, file, filename, encoding, mimetype) => {
    file.pipe(
      concat(async (buf) => {
        console.log('Received', filename, 'size', buf.length);
        const filepath = path.join(os.tmpdir(), filename);
        await fs.writeFile(filepath, buf);
        console.log('File', filename, 'saved to disk at', filepath);
      }),
    );
  };

  const mp = req.multipart(handler, (err) => {
    if (err) {
      reply.code(500).send(err);
      return;
    }
    reply.code(200).send();
  });

  mp.on('field', (key, value) => {
    console.log('form-data', key, value);
  });
});

fastify.listen(process.env.PORT || 3000, (err) => {
  if (err) throw err;
  console.log(`Server listening on ${fastify.server.address().port}`);
});

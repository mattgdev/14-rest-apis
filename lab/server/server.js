'use strict'

// Application dependencies
const express = require('express');
const cors = require('cors');
const pg = require('pg');
const superagent = require('superagent');

// Application Setup
const app = express();
const PORT = process.env.PORT;
const TOKEN = process.env.TOKEN;

// COMMENT: Explain the following line of code. What is the API_KEY? Where did it come from?
//Its setting a variable to the value of the api key. It came from google
const API_KEY = process.env.GOOGLE_API_KEY;

// Database Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

// Application Middleware
app.use(cors());

// API Endpoints
app.get('/api/v1/admin', (req, res) => res.send(TOKEN === parseInt(req.query.token)))

app.get('/api/v1/books/find', (req, res) => {
  let url = 'https://www.googleapis.com/books/v1/volumes';
  // COMMENT: Explain the following four lines of code. How is the query built out? What information will be used to create the query?
  // If there is a value given, query with that input in the appropriate place.
  let query = ''
  if(req.query.title) query += `+intitle:${req.query.title}`;
  if(req.query.author) query += `+inauthor:${req.query.author}`;
  if(req.query.isbn) query += `+isbn:${req.query.isbn}`;

  // COMMENT: What is superagent? How is it being used here? What other libraries are available that could be used for the same purpose?
  //superagent is a client-side http library.
  superagent.get(url)
    .query({'q': query})
    .query({'key': API_KEY})
    .then(response => response.body.items.map((book, idx) => {

      // COMMENT: The line below is an example of destructuring. Explain destructuring in your own words.
      //Its a way to assign  multipul properies to a variable.
      let { title, authors, industryIdentifiers, imageLinks, description } = book.volumeInfo;

      // COMMENT: What is the purpose of the following placeholder image?
      //It creates a placeholder for images that have no cover
      let placeholderImage = 'http://www.newyorkpaddy.com/images/covers/NoCoverAvailable.jpg';

      // COMMENT: Explain how ternary operators are being used below.
      //If the key has a value  then it will return the value, otherwies it will return the string or placeholder indicating that there is no value.
      return {
        title: title ? title : 'No title available',
        author: authors ? authors[0] : 'No authors available',
        isbn: industryIdentifiers ? `ISBN_13 ${industryIdentifiers[0].identifier}` : 'No ISBN available',
        image_url: imageLinks ? imageLinks.smallThumbnail : placeholderImage,
        description: description ? description : 'No description available',
        book_id: industryIdentifiers ? `${industryIdentifiers[0].identifier}` : '',
      }
    }))
    .then(arr => res.send(arr))
    .catch(console.error)
})

// COMMENT: How does this route differ from the route above? What does ':isbn' refer to in the code below?
// The route above looks for isbn is making the route go to the matching isbn in the get request.
app.get('/api/v1/books/find/:isbn', (req, res) => {
  let url = 'https://www.googleapis.com/books/v1/volumes';
  superagent.get(url)
    .query({ 'q': `+isbn:${req.params.isbn}`})
    .query({ 'key': API_KEY })
    .then(response => response.body.items.map((book, idx) => {
      let { title, authors, industryIdentifiers, imageLinks, description } = book.volumeInfo;
      let placeholderImage = 'http://www.newyorkpaddy.com/images/covers/NoCoverAvailable.jpg';

      return {
        title: title ? title : 'No title available',
        author: authors ? authors[0] : 'No authors available',
        isbn: industryIdentifiers ? `ISBN_13 ${industryIdentifiers[0].identifier}` : 'No ISBN available',
        image_url: imageLinks ? imageLinks.smallThumbnail : placeholderImage,
        description: description ? description : 'No description available',
      }
    }))
    .then(book => res.send(book[0]))
    .catch(console.error)
})

app.get('/api/v1/books', (req, res) => {
  let SQL = 'SELECT book_id, title, author, image_url, isbn FROM books;';
  client.query(SQL)
    .then(results => res.send(results.rows))
    .catch(console.error);
});

app.get('/api/v1/books/:id', (req, res) => {
  let SQL = 'SELECT * FROM books WHERE book_id=$1';
  let values = [req.params.id];

  client.query(SQL, values)
    .then(results => res.send(results.rows))
    .catch(console.error);
});

app.post('/api/v1/books', express.urlencoded(), (req, res) => {
  let {title, author, isbn, image_url, description} = req.body;

  let SQL = 'INSERT INTO books(title, author, isbn, image_url, description) VALUES($1, $2, $3, $4, $5);';
  let values = [title, author, isbn, image_url, description];

  client.query(SQL, values)
    .then(() => res.sendStatus(201))
    .catch(console.error);
});

app.put('/api/v1/books/:id', express.urlencoded(), (req, res) => {
  let {title, author, isbn, image_url, description} = req.body;

  let SQL = 'UPDATE books SET title=$1, author=$2, isbn=$3, image_url=$4, description=$5 WHERE book_id=$6;';
  let values = [title, author, isbn, image_url, description, req.params.id];

  client.query(SQL, values)
    .then(() => res.sendStatus(204))
    .catch(console.error)
})

app.delete('/api/v1/books/:id', (req, res) => {
  let SQL = 'DELETE FROM books WHERE book_id=$1;';
  let values = [req.params.id];

  client.query(SQL, values)
    .then(() => res.sendStatus(204))
    .catch(console.error);
});

app.get('*', (req, res) => res.status(403).send('This route does not exist'));

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));

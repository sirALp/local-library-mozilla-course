const Book = require("../models/book");
const Author = require("../models/author");
const Genre = require("../models/genre");
const BookInstance = require("../models/bookinstance");
const { body, validationResult } = require("express-validator");

const asyncHandler = require("express-async-handler");

exports.index = asyncHandler(async (req, res, next) => {
  // get details of books, book instances, authors and genres counts (in parallel)
  const [
    numBooks,
    numInstances,
    numAvailableInstances,
    numAuthors,
    numGenres,
  ] = await Promise.all(
    [
      Book.countDocuments({}).exec(),
      BookInstance.countDocuments({}).exec(),
      BookInstance.countDocuments({ status: "Available" }).exec(),
      Author.countDocuments({}).exec(),
      Genre.countDocuments({}).exec()
    ]
  )

  res.render("index", {
    title: "Local Library Home",
    book_count: numBooks,
    book_instance_count: numInstances,
    book_instance_available_count: numAvailableInstances,
    author_count: numAuthors,
    genre_count: numGenres
  });

});

// Display list of all books.
exports.book_list = asyncHandler(async (req, res, next) => {
  const allBooks = await Book.find({}, "title author")
    .sort({ title: 1 })
    .populate("author")
    .exec();

  res.render("book_list", { title: "Book List", book_list: allBooks });
});


// Display detail page for a specific book.
exports.book_detail = asyncHandler(async (req, res, next) => {
  const [book, bookInstances] = await Promise.all([
    Book.findById(req.params.id).populate("author genre").exec(),
    BookInstance.find({ book: req.params.id }).exec()
  ]);

  if (book === null) {
    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  }

  res.render("book_detail", {
    title: book.title,
    book: book,
    book_instances: bookInstances
  })
});

// Display book create form on GET.
exports.book_create_get = asyncHandler(async (req, res, next) => {
  const [ allAuthors, allGenres ] = await Promise.all([
  Author.find().sort({ family_name: 1 }).exec(),
  Genre.find().sort({ name: 1 }).exec()
  ]) 
  
  res.render("book_form", { 
      title: "Create Book",
      authors: allAuthors,
      genres: allGenres
    });
});

// Handle book create on POST.
exports.book_create_post = [
  (req, res, next) => {
    if (!Array.isArray(req.body.genre)) {
      req.body.genre = 
        typeof req.body.genre === "undefined" ? [] : new Array(req.body.genre); 
    }
    next();
  },

  // validate and sanitize fields
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),

  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("genre.*").escape(),
  // process request after validation and sanitization

  asyncHandler(async (req, res, next) => {
    // extract the validation errors from a request
    const errors = validationResult(req);

    // create a book object with escaped and trimmed data
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre
    });

    if (!errors.isEmpty()) {
      // there are errors. render form again with sanitized values/error messages
      
      // get all authors and genres for form
      const [allAuthors, allGenres] = await Promise.all([
        Author.find().sort({ family_name: 1 }).exec(),
        Genre.find().sort({ name: 1 }).exec()
      ]);

      // mark our selected genres as checked
      for ( const genre of allGenres) {
        if (book.genre.includes(genre._id)) {
          genre.checked = "true";
        }
      }

      res.render("book_form", {
        title: "Create Book",
        authors: allAuthors,
        genres: allGenres,
        book: book,
        errors: errors.array()
      });
      return;
    } else {
      // data from form is valid. save book
      await book.save();
      res.redirect(book.url);
    }

  })
]

// Display book delete form on GET.
exports.book_delete_get = asyncHandler(async (req, res, next) => {
  const [book, bookInstances] = await Promise.all([
    Book.findById(req.params.id).exec(),
    BookInstance.find({ book: req.params.id }).exec()
  ]);

  if (book === null) {
    res.redirect("/catalog/books");
  }

  res.render("book_delete", {
    title: "Delete Book",
    book: book,
    book_instances: bookInstances
  });
});

// Handle book delete on POST.
exports.book_delete_post = asyncHandler(async (req, res, next) => {
    const [book, bookInstances] = await Promise.all([
      Book.findById(req.body.bookid).exec(),
      BookInstance.find({ book: req.body.bookid }).exec()
    ]);

    if (bookInstances.length > 0) {
      // cannot be deleted. render form again with book and bookinstances
      res.render("book_delete", {
        title: "Delete Book",
        book: book,
        book_instances: bookInstances
      });
    } else {
      // book has no instances. delete object and redirect to list of books
      await Book.findByIdAndDelete(req.body.bookid).exec();
      res.redirect("/catalog/books");
    }
});

// Display book update form on GET.
exports.book_update_get = asyncHandler(async (req, res, next) => {
  const [book, allAuthors, allGenres] = await Promise.all([
    Book.findById(req.params.id).populate("author genre").exec(),
    Author.find().sort({family_name:1}).exec(),
    Genre.find().sort({name:1}).exec()
  ]);


  // orFail() method returns a promise that resolves to the document if found, or rejects with an error if not found
  // not used here but good to know
  if (book === null) {
    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  }

  // mark our selected genres as checked
  for (let genre of allGenres) {
    if (book.genre.includes(genre._id)) {
      genre.checked = "true";
    }
  }

  res.render("book_form", {
    title: "Update Book",
    authors: allAuthors,
    genres: allGenres,
    book: book
  });

});

// Handle book update on POST.
exports.book_update_post = [
  (req,res,next) => {
    if (!(req.body.genre instanceof Array)) {
      req.body.genre = typeof req.body.genre === "undefined" ? [] : new Array(req.body.genre);
    }
    next();
  },
  body("title","Title must not be empty.")
    .trim()
    .isLength({min:1})
    .escape(),
  body("author","Author must not be empty.")
    .trim()
    .isLength({min:1})
    .escape(),
  body("summary","Summary must not be empty.")
    .trim()
    .isLength({min:1})
    .escape(),
  body("isbn","ISBN must not be empty.")
    .trim()
    .isLength({min:1})
    .escape(),
  body("genre.*").escape(),
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: typeof req.body.genre === "undefined" ? [] : req.body.genre,
      _id: req.params.id // this is required, or a new ID will be assigned
    });
    
    if (!errors.isEmpty()){
      // there are errors. render form again with sanitized values/error messages

      // get all authors and genres for form
      const [allAuthors, allGenres] = await Promise.all([
        Author.find().sort({family_name:1}).exec(),
        Genre.find().sort({name:1}).exec()
      ]);

      // mark our selected genres as checked
      for (let genre of allGenres) {
        if (book.genre.includes(genre._id)) {
          genre.checked = "true";
        }
      }
      res.render("book_form", {
        title: "Update Book",
        authors: allAuthors,
        genres: allGenres,
        book: book,
        errors: errors.array()
      });
      return;
    } else {
      // data from form is valid. update the record
      const updatedBook = await Book.findByIdAndUpdate(req.params.id, book, {});
      res.redirect(updatedBook.url);
    }
  })
];
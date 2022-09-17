const express = require('express');
const session = require('express-session');
const app = express();
const PORT = 8000;
app.listen(PORT, () => console.log("サーバーが起動しました"));

app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

const mysql = require('mysql2');
const env = require('dotenv').config();
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

connection.connect((err) => {
  if (err) throw err;
  console.log('接続完了');
});


app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

app.use((req,res,next) => {
  if(req.session.memberId === undefined) {
    console.log('ログインしていません');
    // res.redirect('/login');
  } else {
    console.log('ログインしています');
    // const penname = req.session.penname;
    res.locals.penname = req.session.penname;
    res.locals.memberId = req.session.memberId;
  }
  next();
  })

app.get("/", (req, res) => {
  res.render("login.ejs");
})

app.get("/login", (req, res) => {
  res.render("login.ejs");
})

app.post("/login", (req, res) => {
const login_id = req.body.login_id;
connection.query(
  'SELECT * FROM member WHERE login_id = ?',
  [login_id],
  (error, results) => {
    if ( results.length > 0) {
      if(req.body.login_pw === results[0].login_pw) {
        // console.log('認証に成功しました');
        // ユーザーIDをセッション情報に保存
        req.session.memberId = results[0].id;
        req.session.penname = results[0].penname;
        res.redirect('/create');
      } else {
        res.redirect('/login');
      }
    } else {
      console.log('認証に失敗しました');
      res.redirect('/login');
    }
  }
)
})

app.get('/signup', (req, res) => {
  res.render('signup.ejs', {errors:[]});
})

app.post('/signup', 
//項目未入力チェック
  (req, res, next) => {
    const penname = req.body.penname;
    const email = req.body.email;
    const login_id = req.body.login_id;
    const login_pw = req.body.login_pw;
    const errors = [];
    if (penname===''){
      errors.push('ペンネームが空です');
    }
    if (email===''){
      errors.push('メールアドレスが空です');
    }
    if (login_id===''){
      errors.push('ログインIDが空です');
    }
    if (login_pw===''){
      errors.push('ログインパスワードが空です');
    }
    if(errors.length > 0) {
      res.render('signup.ejs', { errors:errors});
    } else {
      next();
    }
  },
  //メールアドレスの重複チェック
  (req, res, next) => {
    const email = req.body.email;
    const errors = [];
    connection.query(
      'SELECT * FROM member WHERE email = ?',
      [email],
      (error, results) => {
        if (results.length > 0) {
          errors.push('そのメールアドレスは既に登録済みです');
          res.render('signup.ejs', { errors: errors});
        } else {
          next();
        }
      }
    )
  },
  //新規メンバー登録処理
  (req, res) => {
    const penname = req.body.penname;
    const email = req.body.email;
    const login_id = req.body.login_id;
    const login_pw = req.body.login_pw;
    connection.query(
      'INSERT INTO member (penname, email, login_id, login_pw) VALUES (?, ?, ?, ?)',
      [penname, email, login_id, login_pw],
      (error, results) => {
        res.redirect('/aftersignup');
      }
    )
  })

app.get('/aftersignup', (req, res) => {
  res.render('aftersignup.ejs');
})

app.get('/logout', (req, res) => {
  req.session.destroy((error) => {
    res.redirect('/login');
  })
})

app.get("/create", (req, res) => {
  const memberId = req.session.memberId;
  // console.log(`memberID: ${memberId}`);
  connection.query(
    'SELECT * FROM renku JOIN posts ON renku.posts_id = posts.post_id JOIN member ON posts.member_id = member.id ',
    (error, results) => {
      // console.log(results);
      res.render("create.ejs", {renku: results});
    }
  )
})

// app.use(express.urlencoded({extended: false}));
app.post("/create", (req, res) => {
  console.log("投稿登録")
  const post = req.body.post;
  // const member_id = req.body.member_id;
  const member_id = res.locals.memberId;
  connection.query(
    'SELECT id FROM renku WHERE posts_id IS NULL AND due_date IS NOT NULL',
    (error, results) => {
      const renku_id = results[0].id
      connection.query(
        'INSERT INTO posts (post, member_id, renku_id, create_date) VALUES(?,?,?,cast ( now() as datetime))', 
        [post, member_id, renku_id],
        (error, results) => {
          res.redirect('/postlist');
        }
      )
    }
  )
})

app.get("/postlist", (req, res) => {
  connection.query(
    'SELECT * FROM posts JOIN member ON posts.member_id = member.id',
    (error, results) => {
      // console.log(results);
      res.render("postlist.ejs", {posts: results});
    }
  )
})

app.post('/delete/:post_id', (req, res) => {
  // console.log(req.params.post_id);
  connection.query(
    'DELETE FROM posts WHERE post_id = ?',
    [req.params.post_id],
    (error, results) => {
      res.redirect('/postlist');
    })
})

app.get("/edit/:post_id", (req, res) => {
  connection.query(
    'SELECT * FROM posts WHERE post_id = ?',
    [req.params.post_id],
    (error, results) => {
      res.render('edit.ejs', {post: results[0]});
    }
  )
})

app.post("/update/:post_id", (req, res) => {
  connection.query(
    'UPDATE posts SET post = ? WHERE post_id = ?',
    [ req.body.post, req.params.post_id],
    (error, results) => {
      res.redirect('/postlist'); 
    }
  )
})

app.get("/renku", (req, res) => {
  res.send("hello renku");
})

app.get("/handle", (req, res) => {
  res.send("hello handle");
})


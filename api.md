# Medium Like Blogging — API Documentation

> REST API endpoints for a **Medium-like blogging platform** covering **authentication**, **user profiles**, **articles**, **comments**, **favorites**, **tags**, and **audits**.

**Base URL:** `/api`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Module 1 — User &amp; Profile Management](#module-1--user--profile-management)
3. [Module 2 — Article &amp; Comment Management](#module-2--article--comment-management)
4. [Module 3 — Tags &amp; Audits](#module-3--tags--audits)
5. [Response Formats](#response-formats)
6. [Error Responses](#error-responses)

---

## Authentication

### Authentication Header

You can read the authentication header from the headers of the request.

`Authorization: Bearer jwt.token.here`

### Login

`POST /api/users/login`

Example request body:

```json
{
	"user": {
		"email": "jake@jake.jake",
		"password": "jakejake"
	}
}
```

No authentication required, returns a [User](#users-for-authentication)

Required fields: `email`, `password`

### Register

`POST /api/users`

Example request body:

```json
{
	"user": {
		"username": "Jacob",
		"email": "jake@jake.jake",
		"password": "jakejake"
	}
}
```

No authentication required, returns a [User](#users-for-authentication)

Required fields: `username`, `email`, `password`

---

## Module 1 — User & Profile Management

### Get Current User

`GET /api/user`

Authentication required, returns the current [User](#users-for-authentication)

### Update User

`PUT /api/user`

Example request body:

```json
{
	"user": {
		"bio": "I like to skateboard",
		"image": "https://i.stack.imgur.com/xHWG8.jpg"
	}
}
```

Authentication required, returns the updated [User](#users-for-authentication)

Accepted fields: `password`, `image`, `bio`

### Get Profile

`GET /api/profiles/:username`

Authentication optional, returns a [Profile](#profile)

### Follow User

`POST /api/profiles/:username/follow`

Authentication required, returns a [Profile](#profile)

No additional parameters required

### Unfollow User

`DELETE /api/profiles/:username/follow`

Authentication required, returns a [Profile](#profile)

No additional parameters required

---

## Module 2 — Article & Comment Management

### List Articles

`GET /api/articles`

Returns most recent articles globally by default.

Query Parameters:

- `?tag=AngularJS` — filter by tag
- `?author=jake` — filter by author username
- `?favorited=jake` — filter by articles favorited by a user
- `?limit=20` — limit number of results (default 20)
- `?offset=0` — offset for pagination (default 0)

Authentication optional, returns [Multiple Articles](#multiple-articles) ordered by most recent first

### Feed Articles

`GET /api/articles/feed`

Query Parameters:

- `?limit=20` — limit number of results (default 20)
- `?offset=0` — offset for pagination (default 0)

Authentication required, returns [Multiple Articles](#multiple-articles) created by followed users, ordered by most recent first

### Get Article

`GET /api/articles/:slug`

No authentication required, returns a [Single Article](#single-article)

### Create Article

`POST /api/articles`

Example request body:

```json
{
	"article": {
		"title": "How to train your dragon",
		"description": "Ever wonder how?",
		"body": "You have to believe",
		"tagList": ["reactjs", "angularjs", "dragons"]
	}
}
```

Authentication required, returns a [Single Article](#single-article)

Required fields: `title`, `description`, `body`

Optional fields: `tagList`

### Update Article

`PUT /api/articles/:slug`

Example request body:

```json
{
	"article": {
		"title": "Did you train your dragon?"
	}
}
```

Authentication required, returns the updated [Single Article](#single-article)

Optional fields: `title`, `description`, `body`

The `slug` also gets updated when the `title` is changed.

### Delete Article

`DELETE /api/articles/:slug`

Authentication required, returns `204 No Content`

### Add Comment to an Article

`POST /api/articles/:slug/comments`

Example request body:

```json
{
	"comment": {
		"body": "His name was my name too."
	}
}
```

Authentication required, returns the created [Single Comment](#single-comment)

Required fields: `body`

### Get Comments from an Article

`GET /api/articles/:slug/comments`

Authentication optional, returns [Multiple Comments](#multiple-comments)

### Delete Comment

`DELETE /api/articles/:slug/comments/:id`

Authentication required, returns `204 No Content`

### Favorite Article

`POST /api/articles/:slug/favorite`

Authentication required, returns the [Single Article](#single-article)

No additional parameters required

### Unfavorite Article

`DELETE /api/articles/:slug/favorite`

Authentication required, returns the [Single Article](#single-article)

No additional parameters required

---

## Module 3 — Tags & Audits

### Get Tags

`GET /api/tags`

No authentication required, returns a [List of Tags](#list-of-tags)

### Get Audit

`GET /api/audits`

Authentication required, returns the audits of the authenticated user

All APIs should include auditing to track user actions.

---

## Response Formats

### Users for Authentication

```json
{
	"user": {
		"email": "jake@jake.jake",
		"token": "jwt.token.here",
		"username": "jake",
		"bio": null,
		"image": null
	}
}
```

### Profile

```json
{
	"profile": {
		"username": "jake",
		"bio": "I work at statefarm",
		"image": "https://api.realworld.io/images/smiley-cyrus.jpg",
		"following": false
	}
}
```

### Single Article

```json
{
	"article": {
		"slug": "how-to-train-your-dragon",
		"title": "How to train your dragon",
		"description": "Ever wonder how?",
		"body": "It takes a Jacobian",
		"tagList": ["dragons", "training"],
		"createdAt": "2016-02-18T03:22:56.637Z",
		"updatedAt": "2016-02-18T03:48:35.824Z",
		"favorited": false,
		"favoritesCount": 0,
		"author": {
			"username": "jake",
			"bio": "I work at statefarm",
			"image": "https://i.stack.imgur.com/xHWG8.jpg",
			"following": false
		}
	}
}
```

### Multiple Articles

```json
{
	"articles": [
		{
			"slug": "how-to-train-your-dragon",
			"title": "How to train your dragon",
			"description": "Ever wonder how?",
			"tagList": ["dragons", "training"],
			"createdAt": "2016-02-18T03:22:56.637Z",
			"updatedAt": "2016-02-18T03:48:35.824Z",
			"favorited": false,
			"favoritesCount": 0,
			"author": {
				"username": "jake",
				"bio": "I work at statefarm",
				"image": "https://i.stack.imgur.com/xHWG8.jpg",
				"following": false
			}
		},
		{
			"slug": "how-to-train-your-dragon-2",
			"title": "How to train your dragon 2",
			"description": "So toothless",
			"tagList": ["dragons", "training"],
			"createdAt": "2016-02-18T03:22:56.637Z",
			"updatedAt": "2016-02-18T03:48:35.824Z",
			"favorited": false,
			"favoritesCount": 0,
			"author": {
				"username": "jake",
				"bio": "I work at statefarm",
				"image": "https://i.stack.imgur.com/xHWG8.jpg",
				"following": false
			}
		}
	],
	"articlesCount": 2
}
```

### Single Comment

```json
{
	"comment": {
		"id": 1,
		"createdAt": "2016-02-18T03:22:56.637Z",
		"updatedAt": "2016-02-18T03:22:56.637Z",
		"body": "It takes a Jacobian",
		"author": {
			"username": "jake",
			"bio": "I work at statefarm",
			"image": "https://i.stack.imgur.com/xHWG8.jpg",
			"following": false
		}
	}
}
```

### Multiple Comments

```json
{
	"comments": [
		{
			"id": 1,
			"createdAt": "2016-02-18T03:22:56.637Z",
			"updatedAt": "2016-02-18T03:22:56.637Z",
			"body": "It takes a Jacobian",
			"author": {
				"username": "jake",
				"bio": "I work at statefarm",
				"image": "https://i.stack.imgur.com/xHWG8.jpg",
				"following": false
			}
		}
	]
}
```

### List of Tags

```json
{
	"tags": ["reactjs", "angularjs"]
}
```

---

## Error Responses

Validation, authentication, authorization, or resource errors should follow a consistent JSON error structure.

Example:

```json
{
	"errors": {
		"body": ["can not be blank"]
	}
}
```

const pgPromise = require('pg-promise')();
const { dbConnection } = require("../database/db_connection.js");

const buildDatabase = require("../database/db_build.js");
const { getAllMainImages, getAllPosts, getAllThumbnails, getComments, getPost, getTags, getUser, getUsername, deleteEmailVerificationToken, getEmailVerificationToken, submitEmailVerificationToken, submitNewComment, submitNewImage, submitNewPost, submitNewThumbnail, submitNewUser, updateVerifiedUser } = require("../queries/index");

describe("Testing database interactions", () => {
  beforeAll(async () => {
    await buildDatabase();
    this.user = await getUser('mistapepper');
  });

  afterAll(async () => {
    await pgPromise.end();
  });

  // INSERT actions
  describe("Testing 'INSERT' actions", () => {
    describe("the getUser function", () => {
      it('should return information for the specified user', async () => {
        const result = await getUser(this.user.username);
        expect(result.email).toBe('bobbysebolao@gmail.com');
      })
    })

    describe("the getUsername function", () => {
      it('should return information for the specified user', async () => {
        const result = await getUsername(this.user.pk_user_id);
        expect(result.email).toBe('bobbysebolao@gmail.com');
      })
    })

    describe("the getAllPosts function", () => {
      it('should return 11 posts', async () => {
        const result = await getAllPosts();
        expect(result.length).toBe(11);
      })
    })

    describe("the getPost function", () => {
      it('should return the post with the specified name', async () => {
        const result = await getPost('subgrid-is-coming.html');
        expect(result.filename).toBe('subgrid-is-coming.html');
      })
    })

    describe("the getTags function", () => {
      it('should return 3 tags that match the user\'s search', async () => {
        const result = await getTags('css');
        expect(result.length).toBe(3);
      })
    })

    describe("the getComments function", () => {
      it('should return 1 comment for the specified blog post', async () => {
        const result = await getComments('subgrid-is-coming.html');
        expect(result.length).toBe(1);
      })
    })

    describe("the getAllThumbnails function", () => {
      it('should return 11 thumbnails', async () => {
        const result = await getAllThumbnails();
        expect(result.length).toBe(11);
      })
    })

    describe("the getAllMainImages function", () => {
      it('should return 40 images', async () => {
        const result = await getAllMainImages();
        expect(result.length).toBe(40);
      })
    })

    describe("the getEmailVerificationToken function", () => {
      it('should return the specified email verification token', async () => {
        const result = await getEmailVerificationToken('7c6eebf82ed38040b05f2ee4d4a2a8b3');
        expect(result.token).toBe('7c6eebf82ed38040b05f2ee4d4a2a8b3');
      })
    })
})

  // CREATE ACTIONS
  describe("Testing 'INSERT' actions", () => {
    describe("the submitEmailVerificationToken function", () => {
      afterAll(async () => {
        await deleteEmailVerificationToken('8d5d0f5e1cfab4432bb1b487af9b803f');
      });

      it('should insert the token into the database', async () => {
        const testToken = {
          token: '8d5d0f5e1cfab4432bb1b487af9b803f',
          username: 'mistapepper',
          timestamp: Date.now()
        }
        const result = await submitEmailVerificationToken(testToken);
        expect(result.rowCount).toBe(1);
      })
    })

    describe("the submitNewComment function", () => {
      afterAll(async () => {
        await dbConnection.none("DELETE FROM comments WHERE pk_comment_id = 2");
      });

      it('should insert the user\'s comment into the database', async () => {
        const testComment = {
          comment: "I really enjoyed reading this!",
          postId: 11,
          userId: this.user.pk_user_id,
          timestamp: Date.now(),
          date: Date(Date.now()),
          username: this.user.username,
          avatarName: this.user.avatar_name,
          avatarFilepath: this.user.avatar_filepath
        }
        const result = await submitNewComment(testComment);
        expect(result.rowCount).toBe(1);
      })
    })

    describe("the submitNewImage function", () => {
      afterEach(async () => {
        await dbConnection.none("DELETE FROM main_images WHERE pk_image_id = 41");
      });

      it('should insert the image into the database', async () => {
        const testImage = {
            name: 'test-main-image',
            size: 58161,
            path: 'https://console-blog.s3.amazonaws.com/local-uploads/practice-images/test-main-image.png',
            type: 'image/png'
        }
        const result = await submitNewImage(testImage);
        expect(result.rowCount).toBe(1);
      })
    })

    describe("the submitNewThumbnail function", () => {
      afterEach(async () => {
        await dbConnection.none("DELETE FROM thumbnails WHERE pk_thumbnail_id = 12");
      });

      it('should insert the thumbnail into the database', async () => {
        const testThumbnail = {
            name: 'test-thumbnail',
            size: 12394,
            path: 'https://console-blog.s3.amazonaws.com/local-uploads/practice-images/test-thumbnail.png',
            type: 'image/png'
        }
        const result = await submitNewThumbnail(testThumbnail);
        expect(result.rowCount).toBe(1);
      })
    })

    describe("the submitNewPost function", () => {
      beforeAll(async () => {
        this.post = await getPost('subgrid-is-coming.html');
        this.post.main_image = {
          name: 'test-main-image',
          size: 35693,
          path: 'https://console-blog.s3.amazonaws.com/local-uploads/practice-images/test-main-image.png',
          type: 'image/png'
      }
        this.post.thumbnail = {
          name: 'test-thumbnail',
          size: 12242,
          path: 'https://console-blog.s3.amazonaws.com/local-uploads/practice-images/test-thumbnail.png',
          type: 'image/jpg'
      }
        this.post.author_name = 'mistapepper';
      });

      afterEach(async () => {
        await dbConnection.none("DELETE FROM posts WHERE pk_post_id = 12");
      });

      it('should insert the post into the database', async () => {
        const testPost = this.post;
        const result = await submitNewPost(testPost);
        expect(result.rowCount).toBe(1);
      })
    })

    describe("the submitNewUser function", () => {
      beforeAll(async () => {
        this.testUser = await getUser('testuser');
        this.testUser.username = "testuser2";
        this.testUser.userImage = {
          name: 'test-main-image',
          size: 58161,
          path: 'https://console-blog.s3.amazonaws.com/local-uploads/practice-images/test-main-image.png',
          type: 'image/png'
      }
      });

      afterAll(async () => {
        await dbConnection.none("DELETE FROM users WHERE username = 'testuser2'");
      });

      it('should insert the user into the database', async () => {
        const testUser = this.testUser;
        const result = await submitNewUser(testUser);
        expect(result.rowCount).toBe(1);
      })
    })
})

  // UPDATE actions
  describe("Testing 'UPDATE' actions", () => {
    describe("the updateVerifiedUser function", () => {
      afterAll(async () => {
        await dbConnection.none("UPDATE users SET is_verified = False WHERE username = 'testuser'");
      });

      it("should set the specified user\'s verified status to 'true'", async () => {
        const result = await updateVerifiedUser('testuser');
        expect(result.rowCount).toBe(1);
      })
    })
})

  // DELETE actions
  describe("Testing 'DELETE' actions", () => {
    describe("the deleteEmailVerificationToken function", () => {
      let token;
      beforeAll(async () => {
        token = await getEmailVerificationToken('7c6eebf82ed38040b05f2ee4d4a2a8b3');
      });

      afterAll(async () => {
        await submitEmailVerificationToken(token.token, this.user.username);
      });

      it('should delete the specified token from the database', async () => {
        const result = await deleteEmailVerificationToken(token.token);
        expect(result.rowCount).toBe(1);
      })
    })
})
})

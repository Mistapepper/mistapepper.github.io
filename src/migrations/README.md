We use [node-pg-migrate](https://github.com/theoephraim/node-pg-migrate) to manage back-end migrations.

To create a new migration:

- Run `npm run migrate create changeTheThing`.
- Edit the generated migration file in `migrations`
- Test it by running `npm run migrate up` and `npm run migrate down` to make sure the up and down migrations do the right thing without errors
- Run `npm run migrate up` again, or `../bin/run-migrations`, to make it stick
- Commit the new file

To test a specific migration, use the commands above with the name of the migration file without path or suffix, e.g. to run `migrations/1463400379081_addCircleTemplate.js`:

- `npm run migrate up 1463400379081_addCircleTemplate`
- `npm run migrate down 1463400379081_addCircleTemplate`

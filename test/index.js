const test = require('ava')

const { join } = require('path')

const { start, stop } = require('mono-test-utils')

const elasticsearchUtils = require('../lib')

const elasticsearchModule = require('mono-elasticsearch')

let ctx

function omit(obj, fields) {
	return Object.keys(obj)
		.filter((key) => fields.indexOf(key) < 0)
		.reduce((newObj, key) => Object.assign(newObj, { [key]: obj[key] }), {})
}

test('Should fail if no client is passed to the constructor', async (t) => {
	ctx = await start(join(__dirname, '/fixtures/ok/'))

	const error = t.throws(() => elasticsearchUtils())

	t.is(error.message, 'no-elasticsearch-client-provided')

	stop(ctx.server)
})

test('Starting mono and check elasticsearchUtils instance', async (t) => {
	ctx = await start(join(__dirname, '/fixtures/ok/'))

	const newClient = elasticsearchUtils(elasticsearchModule.client)
	t.true(newClient.utils instanceof Object)
})

// test('utils.create should create a new document', async (t) => {
// 	t.true(userCollection.utils.create instanceof Function)

// 	const user = await userCollection.utils.create(users[0])
// 	const user2 = await userCollection.utils.create(users[1])

// 	t.deepEqual(users[0], user)
// 	t.deepEqual(users[1], user2)
// 	t.true(users[0].createdAt instanceof Date)
// 	t.true(users[0].updatedAt instanceof Date)
// 	t.true(users[0]._id instanceof ObjectID)

// 	Object.assign(users[0], user)
// 	Object.assign(users[1], user2)
// })

test.after('We close mono server', () => {
	stop(ctx.server)
})


const test = require('ava')

const { join } = require('path')

const { start, stop, stdMock, stdRestore } = require('mono-test-utils')

const elasticsearchUtils = require('../lib')

const elasticsearchModule = require('mono-elasticsearch')

let ctx
let elasticSearchUtilsInstance
let usedIndex
let unusedIndex
let indexTest = {
	index: 'index-test',
	settings: {
		"number_of_shards": "5"
	},
	mappings: {
		"type1": {
			"properties": {
				"field1": { "type": "keyword" }
			},
		}
	}
}
let documentTest = {
	field1: 'field-1'
}
let documentTest2 = {
	field1: 'field-2'
}
const index = 'product'

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

async function deleteIndex(index) {
	// We clear the index if exist
	const exists = await elasticSearchUtilsInstance.indices.exists({ index })

	if (exists) await elasticSearchUtilsInstance.indices.delete({ index })
}

test('Starting mono and check elasticsearchUtils instance', async (t) => {
	elasticSearchUtilsInstance = elasticsearchUtils(elasticsearchModule.client, { log: ctx.log.info })
	await deleteIndex(`${index}_1`)
	await deleteIndex(`${index}_2`)
	await deleteIndex(indexTest.index)

	t.true(elasticSearchUtilsInstance.utils instanceof Object)
})

test("elasticsearch-utils.createIndex create an index with passed settings and mapping", async (t) => {
	stdMock()
	await elasticSearchUtilsInstance.utils.createIndex(indexTest.index, indexTest.settings, indexTest.mappings)
	const { stdout } = stdRestore()

	const indexResult = await elasticSearchUtilsInstance.indices.get({ index: indexTest.index })

	t.true(await elasticSearchUtilsInstance.indices.exists({ index: indexTest.index }))

	t.deepEqual(indexResult[indexTest.index].mappings, indexTest.mappings)
	t.deepEqual(indexResult[indexTest.index].settings.index.number_of_shards, indexTest.settings.number_of_shards)
	t.true(stdout.join().includes(`[elasticsearch-utils] Creating ${indexTest.index} index`))
})

test("elasticsearch-utils clear index should restore the default settings and mappings", async (t) => {
	indexTest.settings.number_of_shards = '3'
	indexTest.mappings['type2'] = indexTest.mappings['type1']
	delete indexTest.mappings['type1']

	stdMock()
	await elasticSearchUtilsInstance.utils.clearIndex(indexTest.index, indexTest.settings, indexTest.mappings)
	const { stdout } = stdRestore()
	const indexResult = await elasticSearchUtilsInstance.indices.get({ index: indexTest.index })

	t.deepEqual(indexResult[indexTest.index].settings.index.number_of_shards, indexTest.settings.number_of_shards)
	t.deepEqual(indexResult[indexTest.index].mappings, indexTest.mappings)
	t.true(stdout.join().includes(`[elasticsearch-utils] Clearing ${indexTest.index} index`))
})

test("elasticsearch-utils.createIndex should not create an existing index", async (t) => {
	const result = await elasticSearchUtilsInstance.utils.createIndex(indexTest.index)

	t.falsy(result)
})

test("elasticsearch-utils createIndice should create two index", async (t) => {
	await deleteIndex(indexTest.index)
	stdMock()
	await elasticSearchUtilsInstance.utils.createIndice(index, indexTest.settings, indexTest.mappings)
	const { stdout } = stdRestore()

	t.true(stdout.join().includes(`Creating ${index} alias pointing to ${index}_1`))
	t.true(await elasticSearchUtilsInstance.indices.exists({ index: `${index}_1` }))
	t.true(await elasticSearchUtilsInstance.indices.exists({ index: `${index}_2` }))

	const alias = await elasticSearchUtilsInstance.indices.getAlias({ name: index })
	let createdAlias = {}

	createdAlias[`${index}_1`] = { aliases: {} }
	createdAlias[`${index}_1`]['aliases'][index] = {}

	t.deepEqual(alias, createdAlias)
})

test(`elasticsearch-utils getUsedIndex should return ${index}_1 by default`, async (t) => {
	usedIndex = await elasticSearchUtilsInstance.utils.getUsedIndex(index)

	t.is(usedIndex, `${index}_1`)
})

test(`elasticsearch-utils getUnusedIndex should return ${index}_2 by default`, async (t) => {
	unusedIndex = await elasticSearchUtilsInstance.utils.getUnusedIndex(index)

	t.is(unusedIndex, `${index}_2`)
})

test("elasticsearch-utils swapIndice should swap the indexes", async (t) => {
	stdMock()
	await elasticSearchUtilsInstance.utils.swapIndice(index)
	const { stdout } = stdRestore()

	t.true(stdout.join().includes(`Moving alias ${index} from ${usedIndex} to ${unusedIndex}`))

	const alias = await elasticSearchUtilsInstance.indices.getAlias({ name: index })
	let updatedAlias = {}

	updatedAlias[`${index}_2`] = { aliases: {} }
	updatedAlias[`${index}_2`]['aliases'][index] = {}

	t.deepEqual(alias, updatedAlias)
})

test("elasticsearch-utils reindexIndice should reindex the unusedIndex with usedIndex documents", async (t) => {
	await elasticSearchUtilsInstance.index({
		index: `${index}_2`,
		type: 'type1',
		body: documentTest,
		refresh: true
	})

	await elasticSearchUtilsInstance.utils.reindexIndice(index)
	const result = await elasticSearchUtilsInstance.search({
		index: `${index}_2`,
		body: {
			query: {
				'match_all': {}
			}
		}
	})

	t.is(result.hits.hits.length, 1)
	t.is(result.hits.hits[0]['_source'][Object.keys(documentTest)[0]], documentTest[Object.keys(documentTest)[0]])
})

test('elasticsearch-utils generateTermFilter should return a term or terms object', (t) => {
	const term1 = { field1: 'field-1' }
	const term2 = { key: { field1: ['field-1', 'field-2'] } }
	const generatedTerm1 = elasticSearchUtilsInstance.utils.generateTermFilter(Object.keys(term1)[0], term1[Object.keys(term1)[0]])
	const generatedTerm2 = elasticSearchUtilsInstance.utils.generateTermFilter(Object.keys(term2)[0], term2[Object.keys(term2)[0]])

	t.true(Object.keys(generatedTerm1).join().includes('term'))
	t.true(Object.keys(generatedTerm2).join().includes('terms'))
	t.deepEqual(generatedTerm1.term, term1)
	t.deepEqual(generatedTerm2.terms, term2)
})

test('elasticsearch-utils generateExistsFilter should return a exists object', (t) => {
	const exist = { field: "field1" }
	const generatedExists = elasticSearchUtilsInstance.utils.generateExistsFilter(exist)

	t.true(Object.keys(generatedExists).join().includes('exists'))
	t.true(Object.keys(generatedExists.exists).join().includes('field'))
	t.deepEqual(generatedExists.exists.field, exist)
})

test('elasticsearch-utils generateRangeFilter should return a valid object', (t) => {
	const generatedRangeFilter = elasticSearchUtilsInstance.utils.generateRangeFilter('age', ['2-12', '3-15'])

	t.true(Object.keys(generatedRangeFilter).join().includes('bool'))
	t.true(Object.keys(generatedRangeFilter.bool).join().includes('should'))
	t.true(Array.isArray(generatedRangeFilter.bool.should))

	t.deepEqual(generatedRangeFilter.bool.should[0], { range: { age: { gte: 2, lte: 12 } } })
	t.deepEqual(generatedRangeFilter.bool.should[1], { range: { age: { gte: 3, lte: 15 } } })
})

test('elasticsearch-utils search should apply the options', async (t) => {
	await elasticSearchUtilsInstance.index({
		index: `${index}_2`,
		type: 'type1',
		body: documentTest2,
		refresh: true
	})

	const search = await elasticSearchUtilsInstance.utils.search({
		index,
		type: 'type1',
		options: {
			limit: 1,
			offset: 0
		}
	})

	t.is(search.hits.hits.length, 1)
})

test('elasticsearch-utils search should apply the body', async (t) => {
	const search = await elasticSearchUtilsInstance.utils.search({
		index,
		type: 'type1',
		options: {
			limit: 1,
			offset: 0
		},
		body: {
			query: elasticSearchUtilsInstance.utils.generateTermFilter(Object.keys(documentTest2)[0], documentTest2[Object.keys(documentTest2)[0]])
		}
	})

	t.is(search.hits.hits.length, 1)
	t.deepEqual(search.hits.hits[0]._source, documentTest2)
})

test(`elasticsearch-utils getUnusedIndex should return an error if not alias exist`, async (t) => {
	await deleteIndex(index)

	stdMock()
	const error = await t.throws(elasticSearchUtilsInstance.utils.getUnusedIndex(index))
	const { stdout } = stdRestore()

	t.is(error.message, `unable-to-find-alias-for-${index}`)
	t.true(stdout.join().includes(`[elasticsearch-utils] Alias ${index}_1,${index}_2 for ${index} not exists`))
})

test.after('We close mono server', () => {
	stop(ctx.server)
})


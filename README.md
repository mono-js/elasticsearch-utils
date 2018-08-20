<h1 align="left"><img src="https://user-images.githubusercontent.com/904724/31862989-9d0c7b16-b747-11e7-814d-9b6f5141ad52.png" alt="ElasticSearch Utils"/></h1>

> ElasticSearch utils for Node.js

[![npm version](https://img.shields.io/npm/v/elasticsearch-utils.svg)](https://www.npmjs.com/package/@terrajs/elasticsearch-utils)
[![Travis](https://img.shields.io/travis/terrajs/elasticsearch-utils/master.svg)](https://travis-ci.org/terrajs/elasticsearch-utils)
[![Coverage](https://img.shields.io/codecov/c/github/terrajs/elasticsearch-utils/master.svg)](https://codecov.io/gh/terrajs/elasticsearch-utils.js)
[![license](https://img.shields.io/github/license/terrajs/elasticsearch-utils.svg)](https://github.com/terrajs/elasticsearch-utils/blob/master/LICENSE)

## Installation

```bash
npm install --save elasticsearch-utils
```

## Usage

elasticsearch utils overide the `collection` class by adding an `utils` object that will expose all the elasticsearch utils methods:

Here an example without mono-elasticsearch
```js
const elasticSearchUtils = require('elasticsearch-utils')
const { Client } = require('elasticsearch')

const client = await new Client(elasticsearchConfiguration)
const elasticSearchUtilsInstance = elasticSearchUtils(client, { log: loggerFunction })

// We can now access to elasticsearch-utils methods from .utils
const result = await elasticSearchUtilsInstance.utils.createIndex('elasticsearch-utils-index')
```

Here an example using [mono-elasticsearch](https://github.com/terrajs/mono-elasticsearch)
```js
const elasticSearchUtils = require('elasticsearch-utils')
const { client } = require('mono-elasticsearch')
const elasticSearchUtilsInstance = elasticSearchUtils(client, { log: loggerFunction })

//We can now access to elasticsearch-utils methods from .utils
const result = await elasticSearchUtilsInstance.utils.createIndex('elasticsearch-utils-index')
```

## Methods

### createIndex

```js
createIndex(index, [settings, mappings]): Promise<void>
```

Create an elasticsearch index if not exist, with a specific settings and mappings

```js
// Create the index `elasticsearch-utils-index` }
elasticSearchUtilsInstance.utils.createIndex('elasticsearch-utils-index')

// Create the index `elasticsearch-utils-index` with the specific settings and mappings
elasticSearchUtilsInstance.utils.createIndex('elasticsearch-utils-index', {
  "number_of_shards": "5"
}, {
 "type1": {
  "properties": {
   "field1": { "type": "keyword" }
   },
 }
})
```

### createIndice

```js
createIndice(indice = string, settings = object, mappings = object): Promise<void>
```

Create two indexes and one alias that pointing to one of it (default `${indice}_1`)
The generated indexes are `${indice}_1` and `${indice}_2`

```js
// Create an indice of the name `elasticsearch-utils`
await elasticSearchUtilsInstance.utils.createIndice('elasticsearch-utils')

// Create an indice with the name `elasticsearch-utils` and with settings and mappings
await elasticSearchUtilsInstance.utils.createIndice('elasticsearch-utils', {
  "number_of_shards": "6"
}, {
 "type1": {
  "properties": {
   "field1": { "type": "keyword" }
   },
 }
})
```

### deleteIndice

```js
deleteIndice(indice = string): Promise<void>
```

Delete a specific indice created by the function createIndice
The method will delete the indexes : `${indice}_1` and `${indice}_2`

```js
// Delete the `elasticsearch-utils` indice
await elasticSearchUtilsInstance.utils.deleteIndice('elasticsearch-utils')
```

### reindexIndice

```js
reindexIndice(indice: string): Promise<void>
```

Reindex the unusedIndex from the usedIndex using the reindex function of elasticsearch

```js
// Update unusedIndex of the indice `elasticsearch-utils`
await elasticSearchUtilsInstance.utils.reindexIndice('elasticsearch-utils')
```

### swapIndice

```js
swapIndice(indice: string): Promise<void>
```

Moving the alias to point to the unused index

```js
// Moving the indice `elasticsearch-utils` from the used index to the unused index
// Ex: Pointing to `elasticsearch-utils_1` to `elasticsearch-utils_2`
await elasticSearchUtilsInstance.utils.swapIndice('elasticsearch-utils')
```

### clearIndice

```js
clearIndice(index: string, settings = object, mappings = object): Promise<void>
```

Clear the unused index of a specific indice with the specific settings and mappings

```js
// Clear the indice `elasticsearch-utils`
// Ex: if current unused index is `elasticsearch-utils_2` then cleaning it.
await elasticSearchUtilsInstance.utils.clearIndice('elasticsearch-utils', {
  "number_of_shards": "4"
}, {
 "type1": {
  "properties": {
   "field1": { "type": "keyword" }
  },
 }
})
```

### clearIndex

```js
clearIndex(index: string, settings = object, mappings = object): Promise<void>
```

Clear a specific index with the specific settings and mappings

```js
// Clear the specified index `elasticsearch-utils`
elasticSearchUtilsInstance.utils.clearIndex('elasticsearch-utils', {
  "number_of_shards": "4"
}, {
 "type1": {
  "properties": {
   "field1": { "type": "keyword" }
  },
 }
})
```

### refreshIndex

```js
refreshIndex(index: string): Promise<void>
```

Refresh a specific index. Call the refresh function of elastic search

```js
//Refresh the `elasticsearch-index` index
elasticSearchUtilsInstance.utils.refreshIndex('elasticsearch-utils')
```

### generateTermFilter

```js
generateTermFilter(field = string, value = string || object): object
```

Generate a term filter to be use with elasticsearch search method

```js
// Generate field1 term with value field-1 -> { term: { field1: 'field-1' }}
generateTermFilter('field1', 'field-1')
// Generate field1 terms with value ['field-1', 'field-2']
generateTermFilter('field1', ['field-1', 'field-2'])
```

### generateExistsFilter

```js
generateExistsFilter(field = object): object
```

Generate exists filter to be use with elasticsearch search method

```js
// Generate field1 exists with value field-1 -> { exists: { field1: 'field-1' }}
generateExistsFilter({ field1: 'field-1' })
```

### generateRangeFilter

```js
generateRangeFilter(field = string, value = string || Array): object
```

Generate range bool should filter to be use with elasticsearch search method

```js
// Generate range for age with 2 to 12 and 4 to 25
generateRangeFilter('age', ['2-12', '4-25'])
```

### search

```js
search(query = object => { index: string, type: string, options = { limit: ..., offset: ... }, body: object })
```

The search method return an elasticsearch search result from a specific index, type, body and options.

Options:
  - `limit`: Nb of hits to return, no limit by default
  - `offset`: Nb of hits to skpi, default: `0`

```js
// We search for a document that match the index `elasticsearch-utils` type `type1` with projection and limit at 1 element
const result = await elasticSearchUtilsInstance.utils.search('elasticsearch-utils', 'type1', {
  limit: 1,
  offset: 0
})
```

### getUsedIndex

```js
getUsedIndex(indice: string): Promise<string>
```

Return the used index for a specific indice

```js
// Return the used index of `elasticsearch-utils` indice
const usedIndex = await elasticSearchUtilsInstance.utils.getUsedIndex('elasticsearch-utils')
```

### getUnusedIndex

```js
getUnusedIndex(indice: string): Promise<string>
```

Return the unused index for a specific indice

```js
// Return the unused index of `elasticsearch-utils` indice
const unusedIndex = await elasticSearchUtilsInstance.utils.getUnusedIndex('elasticsearch-utils')
```



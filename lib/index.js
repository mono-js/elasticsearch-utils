const _ = require('lodash')

module.exports = function (client, options) {
	if (!client) throw new Error('no-elasticsearch-client-provided')

	client.utils = {
		createIndice: async (indice, settings, mappings) => {
			const promises = [
				`${indice}_1`,
				`${indice}_2`
			].map(async (index) => await this.createIndex(index, settings, mappings))

			await Promise.all(promises)

			const existsAlias = await client.indices.existsAlias({ index: `${indice}_1,${indice}_2`, name: indice })

			if (!existsAlias) {
				if (options.log) options.log(`Creating ${indice} alias pointing to ${indice}_1`)

				return await client.indices.putAlias({
					name: indice,
					index: `${indice}_1`
				})
			}
		},
		createIndex: async (index, settings, mappings) => {
			const existsIndex = await client.indices.exists({ index })

			if (existsIndex) return

			if (options.log) options.log(`Creating ${index} index`)

			return await client.indices.create({
				index,
				body: {
					settings,
					mappings
				}
			})
		},
		reindexIndice: async (indice) => {
			const usedIndex = await this.getUsedIndex(indice)
			const unusedIndex = await this.getUnusedIndex(indice)

			await client.reindex({
				body: {
					source: {
						index: usedIndex
					},
					dest: {
						index: unusedIndex
					}
				},
				waitForCompletion: true
			})

			return unusedIndex
		},
		swapIndice: async (indice) => {
			const usedIndex = await this.getUsedIndex(indice)
			const unusedIndex = await this.getUnusedIndex(indice)

			if (options.log) options.log(`Moving alias ${indice} from ${usedIndex} to ${unusedIndex}`)

			return await client.indices.updateAliases({
				body: {
					actions: [
						{ remove: { index: usedIndex, alias: indice } },
						{ add: { index: unusedIndex, alias: indice } }
					]
				}
			})
		},
		clearIndice: async (indice, settings, mappings) => {
			const unusedIndex = await this.getUnusedIndex(indice)

			await this.clearIndex(unusedIndex, settings, mappings)

			return unusedIndex
		},
		clearIndex: async (index, settings, mappings) => {
			if (options.log) options.log(`Clearing ${index} index`)

			const exists = await client.indices.exists({ index })

			if (exists) await client.indices.delete({ index })

			return await client.indices.create({
				index,
				body: {
					settings,
					mappings
				}
			})
		},
		refreshIndex: async (index) => {
			return await client.indices.refresh({ index })
		},
		generateTermFilter: async (field, value) => {
			const term = {}
			term[field] = value

			return typeof value === 'object' ? { terms: term } : { term }
		},
		generateExistsFilter: (field) => {
			return {
				exists: {
					field
				}
			}
		},
		generateRangeFilter: (field, values) => {
			const rangeFilter = {
				bool: {
					should: []
				}
			}

			if (!Array.isArray(values)) values = [values]

			values.forEach((value) => {
				const limits = _.map(value.split('-'), _.parseInt)
				const range = {}

				range[field] = {
					gte: _.min(limits),
					lte: _.max(limits)
				}

				rangeFilter.bool.should.push({ range })
			})

			return rangeFilter
		},
		generateAggregation: (type, field, options) => {
			// Remove postfilter concerning current aggregation
			const postFiltersFiltered = _.filter(options.post_filter || [], (filter) => {
				if (type === 'stats') return !(_.get(filter, 'bool.should'))
				if (type === 'terms') return !(filter.term || filter.terms) || ((filter.term && !filter.term[field]) || (filter.terms && !filter.terms[field]))

				return true
			})

			const aggregationFilters = postFiltersFiltered.length ? {
				and: postFiltersFiltered
			} : undefined

			const aggregation = {}
			aggregation[type] = {
				field,
				size: type === 'terms' ? (options.size || 250) : undefined,
				order: type === 'terms' ? options.order : undefined,
				ranges: type === 'range' ? options.ranges : undefined
			}

			if (options.otherAggregations) aggregation.aggs = options.otherAggregations

			return aggregationFilters ? {
				filter: aggregationFilters,
				aggs: {
					results: aggregation
				}
			} : aggregation
		},
		search: async (index, options, body) => {
			return await client.search({
				index,
				size: options.limit,
				from: options.limit * options.offset,
				body
			})
		},
		getUsedIndex: async (indice) => {
			const response = await client.indices.getAlias({ name: indice })

			return Object.keys(response)[0]
		},
		getUnusedIndex: async (indice) => {
			const indices = {}

			indices[`${indice}_1`] = `${indice}_2`
			indices[`${indice}_2`] = `${indice}_1`

			const response = await client.indices.getAlias({ name: indice })

			return indices[Object.keys(response)[0]]
		}
	}

	return client
}


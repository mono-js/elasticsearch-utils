module.exports = {
	mono: {
		modules: [
			'mono-elasticsearch'
		],
		elasticsearch: {
			host: 'http://localhost:9200',
			dropDatabase: true
		}
	}
}

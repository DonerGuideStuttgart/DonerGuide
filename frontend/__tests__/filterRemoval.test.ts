describe('Filter Removal Logic', () => {
	it('removes single filter from array', () => {
		const currentDistricts = ['Mitte', 'West', 'Ost']
		const valueToRemove = 'West'

		const result = currentDistricts.filter((v) => v !== valueToRemove)

		expect(result).toEqual(['Mitte', 'Ost'])
	})

	it('returns undefined when last item removed from array', () => {
		const currentDistricts = ['Mitte']
		const valueToRemove = 'Mitte'

		const result = currentDistricts.filter((v) => v !== valueToRemove)
		const finalValue = result.length ? result : undefined

		expect(finalValue).toBeUndefined()
	})
})

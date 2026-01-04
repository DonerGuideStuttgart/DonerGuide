'use client'

import ErrorPage from './error'

export default function GlobalError({ reset }: { reset: () => void }) {
	return (
		<html lang="de">
			<body>
				<ErrorPage reset={reset} />
			</body>
		</html>
	)
}

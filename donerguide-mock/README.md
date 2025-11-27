# DönerGuide Mock API

This project provides a mock API for Döner stores in Stuttgart. It is designed to simulate the behavior of a real API while the actual API is not operational.

## Project Structure

```
donerguide-mock
├── src
│   ├── app
│   │   ├── dashboard
│   │   │   └── page.tsx        # Dashboard component
│   │   └── api
│   │       └── stores
│   │           └── route.ts    # API route for fetching stores
│   ├── mocks
│   │   └── stores.json          # Mock data for Döner stores
│   ├── lib
│   │   └── fetchMock.ts         # Function to fetch mock data
│   └── types
│       └── store.ts             # TypeScript interfaces for store data
├── package.json                  # npm configuration
├── tsconfig.json                 # TypeScript configuration
├── next.config.js                # Next.js configuration
└── README.md                     # Project documentation
```

## Getting Started

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd donerguide-mock
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Run the development server:
   ```
   npm run dev
   ```

## API Endpoints

- **GET /api/stores**: Returns a list of Döner stores based on filters. The mock data is served from `src/mocks/stores.json`.

## Mock Data

The mock data for Döner stores is located in `src/mocks/stores.json`. It includes various properties such as:

- `id`
- `name`
- `district`
- `location`
- `rating`
- `price`
- `vegetarian options`
- `halal status`
- `waiting time`
- `payment options`
- `open hours`
- `reviews`

## License

This project is licensed under the MIT License.
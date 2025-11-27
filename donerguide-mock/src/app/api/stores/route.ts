export async function GET() {
    const response = await import('../../../mocks/stores.json');
    return new Response(JSON.stringify(response.default), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
}
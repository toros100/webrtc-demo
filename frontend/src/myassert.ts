// for debugging
const myassert = (condition: boolean, message: string = "no message") => {
    if (!condition) {
        alert(`Assertion failed: ${message}`)
        throw new Error(`Assertion failed: ${message}`)
    }
}
export default myassert
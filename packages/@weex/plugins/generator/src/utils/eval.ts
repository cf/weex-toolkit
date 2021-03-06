/**
 * Evaluate an expression in meta.json in the context of
 * prompt answers data.
 */
export function evaluate(exp, data) {
  /* eslint-disable no-new-func */
  const fn = new Function('data', 'with (data) { return ' + exp + '}')
  try {
    return fn(data)
  } catch (e) {
    console.error('Error when evaluating filter condition: ' + exp)
  }
}

export default evaluate

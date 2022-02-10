function _errorBuilder(): Error {
  const error = new Error('ETIMEDOUT: executePromiseOrTimeout');
  (<any>error).code = 'ETIMEDOUT'; // Node convention
  return error;
}

export function executePromiseOrTimeout<T>(timeoutMs: number, promiseToAwait: Promise<T>, errorBuilder?: () => Error): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const handle = setTimeout(() => {
      const error = (errorBuilder || _errorBuilder)();
      reject(error);
    }, timeoutMs);

    return promiseToAwait.then(resolve).catch(reject)
    .finally(() => {
      clearTimeout(handle);
    });
  });
}

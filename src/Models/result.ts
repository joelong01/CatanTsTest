type Ok<T> = { tag: 'ok', value: T };
type Err<E> = { tag: 'err', error: E };
type Result<T, E> = Ok<T> | Err<E>;

function ok<T>(value: T): Ok<T> {
    return { tag: 'ok', value };
}

function err<E>(error: E): Err<E> {
    return { tag: 'err', error };
}

function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
    return result.tag === 'ok';
}

function isErr<T, E>(result: Result<T, E>): result is Err<E> {
    return result.tag === 'err';
}

export abstract class Result<T, E> {
    abstract isOk(): this is Ok<T>;
    abstract isErr(): this is Err<E>;
    abstract expect(msg: string): T | never;
    abstract getValue(): T | undefined;
    abstract getError(): E | undefined;
}

export class Ok<T> extends Result<T, never> {
    constructor(public value: T) {
        super();
    }

    isOk(): this is Ok<T> {
        return true;
    }

    isErr(): this is Err<never> {
        return false;
    }

    expect(msg: string): T {
        return this.value;
    }

    getValue(): T {
        return this.value;
    }

    getError(): undefined {
        return undefined;
    }
}

export class Err<E> extends Result<never, E> {
    constructor(public error: E) {
        super();
    }

    isOk(): this is Ok<never> {
        return false;
    }

    isErr(): this is Err<E> {
        return true;
    }

    getValue(): undefined {
        return undefined;
    }

    getError(): E {
        return this.error;
    }

    expect(msg: string): never {
        throw new Error(`${msg}: ${this.error}`);
    }
}

// Utility functions to create instances
export function ok<T>(value: T): Ok<T> {
    return new Ok(value);
}

export function err<E>(error: E): Err<E> {
    return new Err(error);
}

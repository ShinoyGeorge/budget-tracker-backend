export interface ErrorMapping {
    errorClass: new (...args: any[]) => Error;
    status: number;
}
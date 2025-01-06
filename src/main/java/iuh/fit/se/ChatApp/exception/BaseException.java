package iuh.fit.se.ChatApp.exception;

import lombok.Getter;

@Getter
public abstract class BaseException extends RuntimeException {
    private final int status;
    private final String message;

    protected BaseException(int status, String message) {
        super(message);
        this.status = status;
        this.message = message;
    }
}
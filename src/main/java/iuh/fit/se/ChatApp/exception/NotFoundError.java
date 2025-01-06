package iuh.fit.se.ChatApp.exception;

import lombok.Getter;

@Getter
public class NotFoundError extends BaseException {
    public NotFoundError(String message) {
        super(404, message + " not found");
    }
}
package iuh.fit.se.ChatApp.exception;

import lombok.Getter;

@Getter
public class MyError extends BaseException {
    public MyError(String message) {
        super(400, message);
    }
}
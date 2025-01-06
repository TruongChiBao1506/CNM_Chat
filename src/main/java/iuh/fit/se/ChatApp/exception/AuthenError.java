package iuh.fit.se.ChatApp.exception;

import lombok.Getter;

@Getter
public class AuthenError extends BaseException {
    public AuthenError() {
        super(401, "Not Authorize");
    }

    public AuthenError(String message) {
        super(401, message);
    }
}
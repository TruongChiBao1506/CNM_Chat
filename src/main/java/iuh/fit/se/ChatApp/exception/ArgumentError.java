package iuh.fit.se.ChatApp.exception;

import lombok.Getter;

@Getter
public class ArgumentError extends BaseException {
    public ArgumentError() {
        super(400, "Params invalid");
    }

    public ArgumentError(String message) {
        super(400, message);
    }
}
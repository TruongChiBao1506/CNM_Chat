package iuh.fit.se.ChatApp.exception;

import iuh.fit.se.ChatApp.dto.response.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundError.class)
    public ResponseEntity<ErrorResponse> handleNotFoundException(NotFoundError ex) {
        ErrorResponse error = new ErrorResponse(ex.getStatus(), ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(AuthenError.class)
    public ResponseEntity<ErrorResponse> handleAuthenError(AuthenError ex) {
        ErrorResponse error = new ErrorResponse(ex.getStatus(), ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(ArgumentError.class)
    public ResponseEntity<ErrorResponse> handleArgumentError(ArgumentError ex) {
        ErrorResponse error = new ErrorResponse(ex.getStatus(), ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MyError.class)
    public ResponseEntity<ErrorResponse> handleMyError(MyError ex) {
        ErrorResponse error = new ErrorResponse(ex.getStatus(), ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(Exception ex) {
        ErrorResponse error = new ErrorResponse(500, "Internal Server Error");
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
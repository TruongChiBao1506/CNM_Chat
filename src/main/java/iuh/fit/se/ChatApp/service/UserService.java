package iuh.fit.se.ChatApp.service;

import iuh.fit.se.ChatApp.dto.response.UserDTO;
import iuh.fit.se.ChatApp.dto.response.UserSummaryDTO;
import iuh.fit.se.ChatApp.entity.User;

import java.util.List;

public interface UserService {
    User saveUser(User user);

    User findByCredentials(String username, String password);

    boolean existsById(String id);

    void checkByIds(List<String> ids, String message);

    UserDTO getById(String id, String message);

    boolean existsByUsername(String username);

    UserDTO findByUsername(String username, String message);

    User checkById(String id, String message);

    UserSummaryDTO getSummaryById(String id, String message);
}

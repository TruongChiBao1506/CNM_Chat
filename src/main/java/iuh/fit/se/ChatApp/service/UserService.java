package iuh.fit.se.ChatApp.service;

import iuh.fit.se.ChatApp.dto.response.UserDTO;
import iuh.fit.se.ChatApp.dto.response.UserStatusDTO;
import iuh.fit.se.ChatApp.dto.response.UserSummaryDTO;
import iuh.fit.se.ChatApp.entity.User;
import org.springframework.data.domain.Page;

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

    User getUserSummaryInfo(String username);

    UserStatusDTO getStatusFriendOfUser(String id, String searchUsername);

    UserStatusDTO getStatusFriendOfUserById(String id, String searchUserId);

    UserStatusDTO buildUserStatusDTO(User searchUser, String myId, String searchUserId);

    long getNumberCommonGroup(String myId, String searchUserId);

    int getNumberCommonFriend(String myId, String searchUserId);

    String getFriendStatus(String myId, String searchUserId);

    Page<UserDTO> getList(String username, int page, int size);

    void updateActived(String userId, boolean status);

    void checkUserExists(String id);
}

package iuh.fit.se.ChatApp.service.impl;

import iuh.fit.se.ChatApp.dto.response.UserDTO;
import iuh.fit.se.ChatApp.dto.response.UserStatusDTO;
import iuh.fit.se.ChatApp.dto.response.UserSummaryDTO;
import iuh.fit.se.ChatApp.entity.User;
import iuh.fit.se.ChatApp.exception.MyError;
import iuh.fit.se.ChatApp.exception.NotFoundError;
import iuh.fit.se.ChatApp.repository.ConversationRepository;
import iuh.fit.se.ChatApp.repository.FriendRepository;
import iuh.fit.se.ChatApp.repository.FriendRequestRepository;
import iuh.fit.se.ChatApp.repository.UserRepository;
import iuh.fit.se.ChatApp.service.UserService;
import iuh.fit.se.ChatApp.utils.DateUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    // Định nghĩa các trạng thái bạn bè có thể có
    private static final List<String> FRIEND_STATUS = Arrays.asList(
            "FRIEND",      // Đã là bạn bè
            "FOLLOWER",    // Đối phương gửi lời mời kết bạn
            "YOU_FOLLOW",  // Bạn đã gửi lời mời kết bạn
            "NOT_FRIEND"   // Chưa có mối quan hệ bạn bè
    );

    private final UserRepository userRepository;
    private final FriendRepository friendRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final ConversationRepository conversationRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private DateUtils dateUtils;



    @Override
    public User saveUser(User user) {
        if (user.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        return userRepository.save(user);
    }

    @Override
    public User findByCredentials(String username, String password) {
        User user = userRepository.findByUsernameAndIsActivedTrueAndIsDeletedFalse(username)
                .orElseThrow(() -> new NotFoundError("User"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new MyError("Password invalid");
        }

        return user;
    }

    @Override
    public boolean existsById(String id) {
        return userRepository.findByIdAndIsActivedTrue(id).isPresent();
    }

    @Override
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsernameAndIsActivedTrue(username);
    }

    @Override
    public UserDTO getById(String id, String message) {
        User user = userRepository.findByIdAndIsActivedTrue(id)
                .orElseThrow(() -> new NotFoundError(message));

        return UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .username(user.getUsername())
                .dateOfBirth(dateUtils.toObject(user.getDateOfBirth()))
                .gender(user.getGender())
                .avatar(user.getAvatar())
                .avatarColor(user.getAvatarColor())
                .coverImage(user.getCoverImage())
                .isAdmin(user.getIsAdmin())
                .phoneBooks(user.getPhoneBooks())
                .build();
    }


    @Override
    public void checkByIds(List<String> ids, String message) {
        for (String id : ids) {
            userRepository.findByIdAndIsActivedTrue(id)
                    .orElseThrow(() -> new NotFoundError(message));
        }
    }

    @Override
    public UserDTO findByUsername(String username, String message) {
        User user = userRepository.findByUsernameAndIsActivedTrueAndIsDeletedFalse(username)
                .orElseThrow(() -> new NotFoundError(message));

        return UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .username(username)
                .dateOfBirth(dateUtils.toObject(user.getDateOfBirth()))
                .gender(user.getGender())
                .avatar(user.getAvatar())
                .avatarColor(user.getAvatarColor())
                .coverImage(user.getCoverImage())
                .build();
    }

    @Override
    public User checkById(String id, String message) {
        return userRepository.findByIdAndIsActivedTrue(id)
                .orElseThrow(() -> new NotFoundError(message));
    }

    @Override
    public UserSummaryDTO getSummaryById(String id, String message) {
        User user = userRepository.findByIdAndIsActivedTrue(id)
                .orElseThrow(() -> new NotFoundError(message));

        return UserSummaryDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .avatar(user.getAvatar())
                .avatarColor(user.getAvatarColor())
                .build();
    }

    /**
     * Lấy thông tin tóm tắt của user dựa vào username
     * @param username Username cần tìm
     * @return UserSummaryDTO chứa thông tin cơ bản của user
     * @throws NotFoundError nếu không tìm thấy user
     */
    public User getUserSummaryInfo(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundError("User"));

        return user;
    }

    /**
     * Lấy trạng thái bạn bè và thông tin liên quan của một user với user khác (tìm bằng username)
     * @param id ID của user hiện tại
     * @param searchUsername Username của user cần tìm
     * @return UserStatusDTO chứa thông tin và trạng thái bạn bè
     */
    public UserStatusDTO getStatusFriendOfUser(String id, String searchUsername) {
        checkUserExists(id);
        User searchUser = userRepository.findByUsername(searchUsername)
                .orElseThrow(() -> new NotFoundError("User"));
        String searchUserId = searchUser.getId();

        return buildUserStatusDTO(searchUser, id, searchUserId);
    }

    /**
     * Lấy trạng thái bạn bè và thông tin liên quan của một user với user khác (tìm bằng ID)
     * @param id ID của user hiện tại
     * @param searchUserId ID của user cần tìm
     * @return UserStatusDTO chứa thông tin và trạng thái bạn bè
     */
    public UserStatusDTO getStatusFriendOfUserById(String id, String searchUserId) {
        checkUserExists(id);
        User searchUser = userRepository.findByIdAndIsActivedTrue(searchUserId)
                .orElseThrow(() -> new NotFoundError("User"));

        return buildUserStatusDTO(searchUser, id, searchUserId);
    }

    /**
     * Helper method để build UserStatusDTO từ thông tin user và các thông tin liên quan
     */
    public UserStatusDTO buildUserStatusDTO(User searchUser, String myId, String searchUserId) {
        return UserStatusDTO.builder()
                .id(searchUser.getId())
                .name(searchUser.getName())
                .username(searchUser.getUsername())
                .dateOfBirth(searchUser.getDateOfBirth())
                .gender(searchUser.getGender())
                .avatar(searchUser.getAvatar())
                .avatarColor(searchUser.getAvatarColor())
                .coverImage(searchUser.getCoverImage())
                .status(getFriendStatus(myId, searchUserId))
                .numberCommonGroup(getNumberCommonGroup(myId, searchUserId))
                .numberCommonFriend(getNumberCommonFriend(myId, searchUserId))
                .build();
    }

    /**
     * Đếm số nhóm chung giữa hai user
     * @param myId ID của user hiện tại
     * @param searchUserId ID của user cần tìm
     * @return Số lượng nhóm chung
     */
    public long getNumberCommonGroup(String myId, String searchUserId) {
        return conversationRepository.countByTypeAndMembersContainingAll(
                true,
                Arrays.asList(myId, searchUserId)
        );
    }

    /**
     * Đếm số bạn chung giữa hai user
     * @param myId ID của user hiện tại
     * @param searchUserId ID của user cần tìm
     * @return Số lượng bạn chung
     */
    public int getNumberCommonFriend(String myId, String searchUserId) {
        // Lấy danh sách ID bạn bè của user cần tìm
        List<String> friendIdsOfSearchUser = friendRepository
                .findFriendIdsExcludingUser(searchUserId)
                .stream()
                .filter(friendId -> !friendId.equals(myId))
                .collect(Collectors.toList());

        // Đếm số bạn chung
        return friendRepository.countCommonFriends(friendIdsOfSearchUser, myId);
    }

    /**
     * Xác định trạng thái bạn bè giữa hai user
     * @param myId ID của user hiện tại
     * @param searchUserId ID của user cần kiểm tra
     * @return Trạng thái bạn bè (FRIEND/FOLLOWER/YOU_FOLLOW/NOT_FRIEND)
     */
    public String getFriendStatus(String myId, String searchUserId) {
        // Kiểm tra đã là bạn bè
        if (friendRepository.existsByUserIds(myId, searchUserId)) {
            return FRIEND_STATUS.get(0);
        }
        // Kiểm tra đối phương đã gửi lời mời kết bạn
        else if (friendRequestRepository.existsByFromIdAndToId(searchUserId, myId)) {
            return FRIEND_STATUS.get(1);
        }
        // Kiểm tra mình đã gửi lời mời kết bạn
        else if (friendRequestRepository.existsByFromIdAndToId(myId, searchUserId)) {
            return FRIEND_STATUS.get(2);
        }
        // Chưa có mối quan hệ bạn bè
        return FRIEND_STATUS.get(3);
    }

    /**
     * Tìm kiếm danh sách user theo username (có phân trang)
     * @param username Username cần tìm (tìm kiếm mờ)
     * @param page Số trang
     * @param size Số lượng item mỗi trang
     * @return Page<UserDTO> chứa danh sách user thỏa mãn
     */
    public Page<UserDTO> getList(String username, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size);
        return userRepository.findByUsernameContaining(username, pageRequest)
                .map(user -> UserDTO.builder()
                        .name(user.getName())
                        .username(user.getUsername())
                        .gender(user.getGender())
                        .isActived(user.getIsActived())
                        .isDeleted(user.getIsDeleted())
                        .isAdmin(user.getIsAdmin())
                        .build());
    }

    /**
     * Cập nhật trạng thái deleted của user
     * @param userId ID của user cần cập nhật
     * @param status Trạng thái deleted mới
     * @throws NotFoundError nếu không tìm thấy user
     */
    public void updateActived(String userId, boolean status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundError("User"));
        user.setIsDeleted(status);
        userRepository.save(user);
    }

    /**
     * Kiểm tra sự tồn tại của user
     * @param id ID của user cần kiểm tra
     * @throws NotFoundError nếu không tìm thấy user
     */
    public void checkUserExists(String id) {
        if (!userRepository.existsById(id)) {
            throw new NotFoundError("User");
        }
    }
}

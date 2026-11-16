package org.example.trai.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.example.trai.entity.PO.UserCurrentReadPO;

@Mapper
public interface UserCurrentReadMapper {
    UserCurrentReadPO queryByUserId(Long userId);


    int updateSortIdAndChapterId(@Param("userId") Long userId,
                                 @Param("bookId") Long bookId,
                                 @Param("chapterId") Long chapterId,
                                 @Param("sortId") Integer sortId);

    void updateState42ByBookId(Long bookId);

    int activateByBook(Long userId, Long bookId);

    int retireById(Long id);

    int resetPointerByChapterId(@Param("deletedChapterId") Long deletedChapterId,
                                @Param("chapterId") Long chapterId,
                                @Param("sortId") Integer sortId);

}

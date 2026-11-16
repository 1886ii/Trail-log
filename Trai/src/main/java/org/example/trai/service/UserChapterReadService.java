package org.example.trai.service;

import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.example.trai.entity.DTO.UserReadChapterDTO;
import org.example.trai.entity.PO.ChapterPO;
import org.example.trai.entity.PO.UserChapterReadPO;
import org.example.trai.entity.PO.UserCurrentReadPO;
import org.example.trai.mapper.ChapterMapper;
import org.example.trai.mapper.UserChapterReadMapper;
import org.example.trai.mapper.UserCurrentReadMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class UserChapterReadService {
    @Resource
    private UserChapterReadMapper userChapterReadMapper;

    @Resource
    private UserCurrentReadMapper userCurrentReadMapper;

    @Resource
    private ChapterMapper chapterMapper;

    @Transactional(rollbackFor = Exception.class)
    public Boolean readChapter(UserReadChapterDTO dto, Long userId) {
        // 1. 章节以库为准：state=0 已在 SQL 里过滤，取真 bookId / sortId，不信任客户端
        ChapterPO chapter = chapterMapper.queryById(dto.getChapterId());
        if (chapter == null) throw new RuntimeException("章节不存在或已删除");
        if (!chapter.getBookId().equals(dto.getBookId())) throw new RuntimeException("章节不属于该书籍");

        Long bookId = chapter.getBookId();
        Integer sortId = chapter.getSortId();

        // 2. 事实：一章一行。重复上报时 insert ignore 返回 0 —— 已读过，正常，不抛
        UserChapterReadPO po = new UserChapterReadPO();
        po.setUserId(userId);
        po.setBookId(bookId);
        po.setChapterId(dto.getChapterId());
        po.setSortId(sortId);
        int inserted = userChapterReadMapper.insertOne(po);
        if (inserted == 0) {
            log.info("章节已读过，忽略：userId={}, chapterId={}", userId, dto.getChapterId());
        }

        // 3. 指针：保证指向本书（首次直进阅读页 / 从任务直达，都不会先调换书接口）
        //    先退后进 —— 任何时刻最多一行 state=0
        UserCurrentReadPO cur = userCurrentReadMapper.queryByUserId(userId);
        if (cur != null && !bookId.equals(cur.getBookId())) {
            userCurrentReadMapper.retireById(cur.getId());
        }
        userCurrentReadMapper.activateByBook(userId, bookId);   // 无行插入 / state=1或2 复活

        // 4. 指针只前进不后退。0 行 = 回看旧章 / 重复点同一章 / 已不是本书在读，全是正常
        int updated = userCurrentReadMapper.updateSortIdAndChapterId(userId, bookId, dto.getChapterId(), sortId);
        if (updated == 0) {
            log.warn("指针未前进：userId={}, bookId={}, sortId={}", userId, bookId, sortId);
        }

        return true;
    }
}

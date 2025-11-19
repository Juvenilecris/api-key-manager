const fetchKeysFromCloud = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch('/api/storage', {
        method: 'GET',
        headers: { 
          'x-auth-token': '1006',
          'Cache-Control': 'no-cache' // 防止浏览器缓存请求
        } 
      });

      if (res.ok) {
        const data = await res.json();
        // --- 关键修复：前端双重保险 ---
        // 只有当 data 确实是数组时才更新状态，否则忽略（防止 map 报错）
        if (Array.isArray(data)) {
          setKeys(data);
        } else {
          console.warn("Received invalid data format:", data);
          setKeys([]); // 数据格式不对，重置为空，防止白屏
        }
      } else {
        console.error("Fetch failed with status:", res.status);
      }
    } catch (error) {
      console.error("Failed to load keys", error);
    } finally {
      setIsLoadingData(false);
    }
  };